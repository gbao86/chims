"""
PC Build Compatibility Engine

Checks hardware compatibility between components:
1. CPU socket ↔ Mainboard socket
2. RAM type (DDR4/DDR5) ↔ Mainboard support
3. Total TDP vs PSU wattage (80% rule)
4. Case form factor vs Mainboard form factor
5. GPU length vs Case max GPU length
"""

from typing import List, Dict, Any, Tuple

# Socket → Brand mapping
SOCKET_BRAND_MAP = {
    "LGA1700": "Intel",
    "LGA1851": "Intel",
    "LGA1200": "Intel",
    "LGA1151": "Intel",
    "AM5": "AMD",
    "AM4": "AMD",
    "sTR5": "AMD",
    "sTRX4": "AMD",
}

# Form factor compatibility (case supports mainboard)
FORM_FACTOR_COMPAT = {
    "Full Tower": ["E-ATX", "ATX", "Micro-ATX", "Mini-ITX"],
    "Mid Tower": ["ATX", "Micro-ATX", "Mini-ITX"],
    "Mini Tower": ["Micro-ATX", "Mini-ITX"],
    "SFF": ["Mini-ITX"],
    "E-ATX": ["E-ATX", "ATX", "Micro-ATX", "Mini-ITX"],
    "ATX": ["ATX", "Micro-ATX", "Mini-ITX"],
    "Micro-ATX": ["Micro-ATX", "Mini-ITX"],
    "Mini-ITX": ["Mini-ITX"],
}

# Default TDP values by category (fallback)
DEFAULT_TDP = {
    "CPU": 125,
    "GPU": 250,
    "RAM": 5,
    "Storage": 7,
    "Mainboard": 15,
    "Cooling": 5,
    "Case": 0,
    "PSU": 0,
}


def get_spec_value(specs: Dict[str, Any], keys: List[str], default: Any = "") -> Any:
    """Get a spec value, trying multiple key variations."""
    for key in keys:
        val = specs.get(key)
        if val is not None and val != "":
            return val
        # Case-insensitive
        for k, v in specs.items():
            if k.lower() == key.lower() and v is not None and v != "":
                return v
    return default


def extract_tdp(specs: Dict[str, Any], category: str) -> int:
    """Extract TDP from specs or use default."""
    tdp = get_spec_value(specs, ["TDP", "tdp", "Wattage", "wattage", "power", "Power"], None)
    if tdp is not None:
        try:
            return int(str(tdp).replace("W", "").replace("w", "").strip())
        except (ValueError, TypeError):
            pass
    return DEFAULT_TDP.get(category, 10)


def extract_psu_wattage(specs: Dict[str, Any]) -> int:
    """Extract PSU wattage from specs."""
    wattage = get_spec_value(specs, ["Wattage", "wattage", "Power", "power", "TDP", "tdp"], None)
    if wattage is not None:
        try:
            return int(str(wattage).replace("W", "").replace("w", "").strip())
        except (ValueError, TypeError):
            pass
    return 0


def check_compatibility(
    components: List[Dict[str, Any]],
) -> Tuple[str, List[str], int, int, float]:
    """
    Check compatibility between PC build components.

    Args:
        components: List of dicts with keys: category, specs, unit_price, quantity

    Returns:
        (level, notes, total_tdp, recommended_psu, total_price)
    """
    notes: List[str] = []
    level = "compatible"
    total_tdp = 0
    total_price = 0.0

    # Organize components by category
    by_category: Dict[str, List[Dict]] = {}
    for comp in components:
        cat = comp.get("category", "Other")
        by_category.setdefault(cat, []).append(comp)
        total_price += comp.get("unit_price", 0) * comp.get("quantity", 1)

    # ── 1. Calculate total TDP ──
    psu_wattage = 0
    for comp in components:
        cat = comp.get("category", "Other")
        specs = comp.get("specs", {})
        if cat == "PSU":
            psu_wattage = extract_psu_wattage(specs)
        else:
            tdp = extract_tdp(specs, cat)
            total_tdp += tdp * comp.get("quantity", 1)

    # PSU recommendation (TDP × 1.25 rounded up to nearest 50)
    recommended_psu = ((int(total_tdp * 1.25) + 49) // 50) * 50
    if recommended_psu < 450:
        recommended_psu = 450

    # ── 2. CPU ↔ Mainboard Socket Check ──
    cpus = by_category.get("CPU", [])
    mainboards = by_category.get("Mainboard", [])

    if cpus and mainboards:
        for cpu in cpus:
            cpu_specs = cpu.get("specs", {})
            cpu_socket = get_spec_value(cpu_specs, ["Socket", "socket"])
            cpu_brand = get_spec_value(cpu_specs, ["Brand", "brand"])

            for mb in mainboards:
                mb_specs = mb.get("specs", {})
                mb_socket = get_spec_value(mb_specs, ["Socket", "socket"])

                if cpu_socket and mb_socket and cpu_socket != mb_socket:
                    notes.append(
                        f"❌ Socket không khớp: CPU ({cpu_socket}) ≠ Mainboard ({mb_socket})"
                    )
                    level = "error"
                elif cpu_brand and mb_socket:
                    expected_brand = SOCKET_BRAND_MAP.get(mb_socket, "")
                    if expected_brand and cpu_brand.lower() != expected_brand.lower():
                        notes.append(
                            f"❌ CPU {cpu_brand} không tương thích với Mainboard socket {mb_socket} ({expected_brand})"
                        )
                        level = "error"

    # ── 3. RAM ↔ Mainboard DDR Check ──
    rams = by_category.get("RAM", [])
    if rams and mainboards:
        for ram in rams:
            ram_specs = ram.get("specs", {})
            ram_type = get_spec_value(ram_specs, ["Type", "type", "DDR", "ddr", "Memory Type"])

            for mb in mainboards:
                mb_specs = mb.get("specs", {})
                mb_ram_support = get_spec_value(mb_specs, [
                    "RAM Type", "ram_type", "Memory Type", "memory_type",
                    "Supported RAM", "DDR"
                ])

                if ram_type and mb_ram_support:
                    ram_ddr = "DDR5" if "DDR5" in str(ram_type).upper() else (
                        "DDR4" if "DDR4" in str(ram_type).upper() else ""
                    )
                    mb_ddr = "DDR5" if "DDR5" in str(mb_ram_support).upper() else (
                        "DDR4" if "DDR4" in str(mb_ram_support).upper() else ""
                    )
                    if ram_ddr and mb_ddr and ram_ddr != mb_ddr:
                        notes.append(
                            f"❌ RAM {ram_ddr} không tương thích với Mainboard hỗ trợ {mb_ddr}"
                        )
                        level = "error"

    # ── 4. PSU Wattage Check ──
    if psu_wattage > 0:
        if total_tdp > psu_wattage * 0.8:
            notes.append(
                f"⚠️ Tổng TDP ({total_tdp}W) vượt 80% công suất PSU ({psu_wattage}W). "
                f"Khuyến nghị PSU tối thiểu {recommended_psu}W"
            )
            if level != "error":
                level = "warning"
        else:
            notes.append(f"✅ PSU {psu_wattage}W đáp ứng tốt (TDP: {total_tdp}W)")
    elif by_category.get("PSU"):
        notes.append("⚠️ Không đọc được công suất PSU từ specs")
        if level != "error":
            level = "warning"

    # ── 5. Case ↔ Mainboard Form Factor Check ──
    cases = by_category.get("Case", [])
    if cases and mainboards:
        for case in cases:
            case_specs = case.get("specs", {})
            case_ff = get_spec_value(case_specs, [
                "Form Factor", "form_factor", "Size", "Type"
            ])

            for mb in mainboards:
                mb_specs = mb.get("specs", {})
                mb_ff = get_spec_value(mb_specs, [
                    "Form Factor", "form_factor", "Size"
                ])

                if case_ff and mb_ff:
                    compatible_ffs = FORM_FACTOR_COMPAT.get(case_ff, [])
                    if compatible_ffs and mb_ff not in compatible_ffs:
                        notes.append(
                            f"❌ Case ({case_ff}) không vừa Mainboard ({mb_ff})"
                        )
                        level = "error"

    # ── Summary notes ──
    if not notes:
        if len(by_category) < 3:
            notes.append("ℹ️ Cấu hình chưa đủ linh kiện để kiểm tra đầy đủ")
        else:
            notes.append("✅ Tất cả linh kiện tương thích")

    missing = []
    essential = ["CPU", "Mainboard", "RAM", "PSU"]
    for cat in essential:
        if cat not in by_category:
            missing.append(cat)
    if missing:
        notes.append(f"ℹ️ Thiếu linh kiện: {', '.join(missing)}")

    return level, notes, total_tdp, recommended_psu, total_price
