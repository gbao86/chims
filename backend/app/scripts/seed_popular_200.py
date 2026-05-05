import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.append(str(ROOT))

from app.database import connect_db, close_db, get_db  # noqa: E402
from app.models.inventory import compute_stock_status  # noqa: E402

POPULAR_200 = [
    # CPU
    {"sku_code": "CPU-004", "name": "Intel Core i5-12400F", "category": "CPU", "brand": "Intel"},
    {"sku_code": "CPU-005", "name": "Intel Core i5-13400F", "category": "CPU", "brand": "Intel"},
    {"sku_code": "CPU-006", "name": "Intel Core i5-13600K", "category": "CPU", "brand": "Intel"},
    {"sku_code": "CPU-007", "name": "Intel Core i7-12700K", "category": "CPU", "brand": "Intel"},
    {"sku_code": "CPU-008", "name": "Intel Core i7-13700K", "category": "CPU", "brand": "Intel"},
    {"sku_code": "CPU-009", "name": "Intel Core i7-14700K", "category": "CPU", "brand": "Intel"},
    {"sku_code": "CPU-010", "name": "AMD Ryzen 5 7500F", "category": "CPU", "brand": "AMD"},
    {"sku_code": "CPU-011", "name": "AMD Ryzen 5 7600", "category": "CPU", "brand": "AMD"},
    {"sku_code": "CPU-012", "name": "AMD Ryzen 7 7700X", "category": "CPU", "brand": "AMD"},
    {"sku_code": "CPU-013", "name": "AMD Ryzen 7 7800X3D", "category": "CPU", "brand": "AMD"},
    {"sku_code": "CPU-014", "name": "AMD Ryzen 9 7900X", "category": "CPU", "brand": "AMD"},
    {"sku_code": "CPU-015", "name": "AMD Ryzen 9 7950X3D", "category": "CPU", "brand": "AMD"},
    # GPU
    {"sku_code": "GPU-004", "name": "NVIDIA RTX 4060", "category": "GPU", "brand": "NVIDIA"},
    {"sku_code": "GPU-005", "name": "NVIDIA RTX 4060 Ti", "category": "GPU", "brand": "NVIDIA"},
    {"sku_code": "GPU-006", "name": "NVIDIA RTX 4070", "category": "GPU", "brand": "NVIDIA"},
    {"sku_code": "GPU-007", "name": "NVIDIA RTX 4070 Super", "category": "GPU", "brand": "NVIDIA"},
    {"sku_code": "GPU-008", "name": "NVIDIA RTX 4080 Super", "category": "GPU", "brand": "NVIDIA"},
    {"sku_code": "GPU-009", "name": "NVIDIA RTX 4090", "category": "GPU", "brand": "NVIDIA"},
    {"sku_code": "GPU-010", "name": "AMD RX 7600", "category": "GPU", "brand": "AMD"},
    {"sku_code": "GPU-011", "name": "AMD RX 7700 XT", "category": "GPU", "brand": "AMD"},
    {"sku_code": "GPU-012", "name": "AMD RX 7800 XT", "category": "GPU", "brand": "AMD"},
    {"sku_code": "GPU-013", "name": "AMD RX 7900 XT", "category": "GPU", "brand": "AMD"},
    {"sku_code": "GPU-014", "name": "AMD RX 7900 XTX", "category": "GPU", "brand": "AMD"},
    {"sku_code": "GPU-015", "name": "NVIDIA RTX 3050", "category": "GPU", "brand": "NVIDIA"},
    # RAM
    {"sku_code": "RAM-004", "name": "Kingston Fury Beast DDR4 16GB", "category": "RAM", "brand": "Kingston"},
    {"sku_code": "RAM-005", "name": "Kingston Fury Beast DDR5 16GB", "category": "RAM", "brand": "Kingston"},
    {"sku_code": "RAM-006", "name": "Kingston Fury Beast DDR5 32GB", "category": "RAM", "brand": "Kingston"},
    {"sku_code": "RAM-007", "name": "Corsair Vengeance DDR4 16GB", "category": "RAM", "brand": "Corsair"},
    {"sku_code": "RAM-008", "name": "Corsair Vengeance DDR5 16GB", "category": "RAM", "brand": "Corsair"},
    {"sku_code": "RAM-009", "name": "Corsair Vengeance DDR5 32GB", "category": "RAM", "brand": "Corsair"},
    {"sku_code": "RAM-010", "name": "G.Skill Trident Z5 RGB DDR5 32GB", "category": "RAM", "brand": "G.Skill"},
    {"sku_code": "RAM-011", "name": "G.Skill Flare X5 DDR5 32GB", "category": "RAM", "brand": "G.Skill"},
    {"sku_code": "RAM-012", "name": "TeamGroup T-Force Delta RGB DDR5 32GB", "category": "RAM", "brand": "TeamGroup"},
    {"sku_code": "RAM-013", "name": "Adata XPG Lancer DDR5 32GB", "category": "RAM", "brand": "Adata"},
    # Storage
    {"sku_code": "SSD-003", "name": "Samsung 990 PRO 1TB", "category": "Storage", "brand": "Samsung"},
    {"sku_code": "SSD-004", "name": "Samsung 990 PRO 2TB", "category": "Storage", "brand": "Samsung"},
    {"sku_code": "SSD-005", "name": "Samsung 980 PRO 1TB", "category": "Storage", "brand": "Samsung"},
    {"sku_code": "SSD-006", "name": "WD Black SN850X 1TB", "category": "Storage", "brand": "WD"},
    {"sku_code": "SSD-007", "name": "WD Black SN850X 2TB", "category": "Storage", "brand": "WD"},
    {"sku_code": "SSD-008", "name": "Kingston NV2 1TB", "category": "Storage", "brand": "Kingston"},
    {"sku_code": "SSD-009", "name": "Kingston KC3000 1TB", "category": "Storage", "brand": "Kingston"},
    {"sku_code": "SSD-010", "name": "Crucial P3 Plus 1TB", "category": "Storage", "brand": "Crucial"},
    {"sku_code": "SSD-011", "name": "Crucial P5 Plus 2TB", "category": "Storage", "brand": "Crucial"},
    {"sku_code": "SSD-012", "name": "Lexar NM790 1TB", "category": "Storage", "brand": "Lexar"},
    # Mainboard
    {"sku_code": "MB-003", "name": "MSI B650 Tomahawk WiFi", "category": "Mainboard", "brand": "MSI"},
    {"sku_code": "MB-004", "name": "ASUS TUF Gaming B650-Plus WiFi", "category": "Mainboard", "brand": "ASUS"},
    {"sku_code": "MB-005", "name": "ASUS ROG STRIX B760-F Gaming WiFi", "category": "Mainboard", "brand": "ASUS"},
    {"sku_code": "MB-006", "name": "MSI Z790 Tomahawk WiFi", "category": "Mainboard", "brand": "MSI"},
    {"sku_code": "MB-007", "name": "Gigabyte B650 AORUS Elite AX", "category": "Mainboard", "brand": "Gigabyte"},
    {"sku_code": "MB-008", "name": "Gigabyte Z790 AORUS Elite AX", "category": "Mainboard", "brand": "Gigabyte"},
    {"sku_code": "MB-009", "name": "ASRock B650M Pro RS", "category": "Mainboard", "brand": "ASRock"},
    {"sku_code": "MB-010", "name": "MSI B760M Mortar WiFi", "category": "Mainboard", "brand": "MSI"},
    # PSU
    {"sku_code": "PSU-003", "name": "Corsair RM1000e", "category": "PSU", "brand": "Corsair"},
    {"sku_code": "PSU-004", "name": "Seasonic Focus GX-850", "category": "PSU", "brand": "Seasonic"},
    {"sku_code": "PSU-005", "name": "Seasonic Focus GX-1000", "category": "PSU", "brand": "Seasonic"},
    {"sku_code": "PSU-006", "name": "Cooler Master MWE Gold 750", "category": "PSU", "brand": "Cooler Master"},
    {"sku_code": "PSU-007", "name": "Cooler Master MWE Gold 850", "category": "PSU", "brand": "Cooler Master"},
    {"sku_code": "PSU-008", "name": "Antec NeoECO Gold 850W", "category": "PSU", "brand": "Antec"},
    {"sku_code": "PSU-009", "name": "Corsair RM850x", "category": "PSU", "brand": "Corsair"},
    {"sku_code": "PSU-010", "name": "DeepCool PX850G", "category": "PSU", "brand": "DeepCool"},
    # Case
    {"sku_code": "CASE-002", "name": "NZXT H5 Flow", "category": "Case", "brand": "NZXT"},
    {"sku_code": "CASE-003", "name": "NZXT H7 Flow", "category": "Case", "brand": "NZXT"},
    {"sku_code": "CASE-004", "name": "Lian Li Lancool 216", "category": "Case", "brand": "Lian Li"},
    {"sku_code": "CASE-005", "name": "Cooler Master TD500 Mesh", "category": "Case", "brand": "Cooler Master"},
    {"sku_code": "CASE-006", "name": "Corsair 4000D Airflow", "category": "Case", "brand": "Corsair"},
    {"sku_code": "CASE-007", "name": "Montech Air 903 Max", "category": "Case", "brand": "Montech"},
    # Cooling
    {"sku_code": "COOL-002", "name": "DeepCool AK620", "category": "Cooling", "brand": "DeepCool"},
    {"sku_code": "COOL-003", "name": "DeepCool LS720", "category": "Cooling", "brand": "DeepCool"},
    {"sku_code": "COOL-004", "name": "Thermalright Peerless Assassin 120", "category": "Cooling", "brand": "Thermalright"},
    {"sku_code": "COOL-005", "name": "Noctua NH-U12A", "category": "Cooling", "brand": "Noctua"},
    {"sku_code": "COOL-006", "name": "Noctua NH-D15", "category": "Cooling", "brand": "Noctua"},
    {"sku_code": "COOL-007", "name": "Arctic Liquid Freezer II 360", "category": "Cooling", "brand": "Arctic"},
    # Monitor
    {"sku_code": "MON-001", "name": "ASUS TUF Gaming VG249Q1A", "category": "Monitor", "brand": "ASUS"},
    {"sku_code": "MON-002", "name": "LG 27GN800-B", "category": "Monitor", "brand": "LG"},
    {"sku_code": "MON-003", "name": "Dell S2721DGF", "category": "Monitor", "brand": "Dell"},
    {"sku_code": "MON-004", "name": "Gigabyte M27Q", "category": "Monitor", "brand": "Gigabyte"},
    {"sku_code": "MON-005", "name": "Samsung Odyssey G5 27", "category": "Monitor", "brand": "Samsung"},
    {"sku_code": "MON-006", "name": "AOC 24G2", "category": "Monitor", "brand": "AOC"},
    # Keyboard / Mouse / Headset
    {"sku_code": "KB-001", "name": "Keychron K2", "category": "Keyboard", "brand": "Keychron"},
    {"sku_code": "KB-002", "name": "Logitech G Pro X TKL", "category": "Keyboard", "brand": "Logitech"},
    {"sku_code": "KB-003", "name": "Akko 3087B Plus", "category": "Keyboard", "brand": "Akko"},
    {"sku_code": "KB-004", "name": "Razer BlackWidow V4", "category": "Keyboard", "brand": "Razer"},
    {"sku_code": "MOUSE-001", "name": "Logitech G Pro X Superlight", "category": "Mouse", "brand": "Logitech"},
    {"sku_code": "MOUSE-002", "name": "Razer DeathAdder V3 Pro", "category": "Mouse", "brand": "Razer"},
    {"sku_code": "MOUSE-003", "name": "Logitech G304", "category": "Mouse", "brand": "Logitech"},
    {"sku_code": "MOUSE-004", "name": "Razer Basilisk V3", "category": "Mouse", "brand": "Razer"},
    {"sku_code": "HS-001", "name": "HyperX Cloud II", "category": "Headset", "brand": "HyperX"},
    {"sku_code": "HS-002", "name": "Razer BlackShark V2", "category": "Headset", "brand": "Razer"},
    {"sku_code": "HS-003", "name": "Logitech G Pro X Headset", "category": "Headset", "brand": "Logitech"},
    {"sku_code": "HS-004", "name": "SteelSeries Arctis Nova 7", "category": "Headset", "brand": "SteelSeries"},
    # Laptop / Office / Accessories (kept as Other)
    {"sku_code": "OT-001", "name": "Dell XPS 15", "category": "Other", "brand": "Dell"},
    {"sku_code": "OT-002", "name": "ASUS TUF Gaming F15", "category": "Other", "brand": "ASUS"},
    {"sku_code": "OT-003", "name": "Lenovo ThinkPad X1 Carbon", "category": "Other", "brand": "Lenovo"},
    {"sku_code": "OT-004", "name": "HP ProBook 450 G8", "category": "Other", "brand": "HP"},
    {"sku_code": "OT-005", "name": "Acer Nitro 5", "category": "Other", "brand": "Acer"},
    {"sku_code": "OT-006", "name": "MSI GF63 Thin", "category": "Other", "brand": "MSI"},
    {"sku_code": "OT-007", "name": "Canon PIXMA G3020", "category": "Other", "brand": "Canon"},
    {"sku_code": "OT-008", "name": "TP-Link Archer AX23", "category": "Other", "brand": "TP-Link"},
]


async def main():
    await connect_db()
    db = get_db()
    existing = {doc["sku_code"] async for doc in db.inventory.find({}, {"sku_code": 1})}
    docs = []
    for item in POPULAR_200:
        if item["sku_code"] in existing:
            continue
        docs.append({
            **item,
            "image_url": "",
            "specs": {},
            "stock_quantity": 0,
            "min_stock": 5,
            "cost_price": 0,
            "unit_price": 0,
            "warranty_months": 24,
            "location": "",
            "barcode": "",
            "status": compute_stock_status(0).value,
            "created_at": None,
            "updated_at": None,
        })
    if docs:
        await db.inventory.insert_many(docs)
        print(f"Inserted {len(docs)} popular SKU seed items")
    else:
        print("No new popular SKU items inserted")
    await close_db()


if __name__ == "__main__":
    asyncio.run(main())
