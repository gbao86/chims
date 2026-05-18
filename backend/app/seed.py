# Copyright (C) 2026 gbao86 <tiktokthu10@gmail.com>
# This file is part of the chims project.
# Licensed under the GNU General Public License v3.0; see LICENSE for details.
"""
Seed script to populate the database with demo data.
Run: python -m app.seed
"""

import asyncio
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from app.config import get_settings
from app.models.inventory import compute_stock_status
import certifi

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def local_image_url(sku_code: str) -> str:
    return f"/catalog/{sku_code.lower()}.png"


def build_specs(category: str, name: str, base_specs: dict) -> dict:
    specs = dict(base_specs)
    if category == "CPU":
        specs.setdefault("process", "TSMC 7nm")
        specs.setdefault("package", "Boxed")
        specs.setdefault("supports_overclock", "Yes")
        specs.setdefault("l2_cache", "")
        specs.setdefault("l3_cache", "")
    elif category == "GPU":
        specs.setdefault("architecture", "")
        specs.setdefault("memory_bus", "")
        specs.setdefault("recommended_psu", "")
        specs.setdefault("outputs", "HDMI / DisplayPort")
    elif category == "RAM":
        specs.setdefault("form_factor", "UDIMM")
        specs.setdefault("rgb", "Depends on model")
        specs.setdefault("xmp_expo", "Yes")
    elif category == "Storage":
        specs.setdefault("form_factor", "M.2 2280" if "SSD" in name else "3.5-inch")
        specs.setdefault("endurance", "")
        specs.setdefault("warranty", "")
    elif category == "Mainboard":
        specs.setdefault("memory_support", "")
        specs.setdefault("storage_slots", "")
        specs.setdefault("network", "2.5GbE + Wi-Fi" if "WiFi" in name else "2.5GbE")
    elif category == "PSU":
        specs.setdefault("form_factor", "ATX")
        specs.setdefault("rail", "+12V Single Rail")
        specs.setdefault("protections", "OVP/UVP/OCP/OPP/SCP/OTP")
    elif category == "Cooling":
        specs.setdefault("type", "Air Cooler")
        specs.setdefault("socket_support", "AMD AM4/AM5, Intel LGA1700")
        specs.setdefault("airflow", "")
    elif category == "Other":
        specs.setdefault("panel", "Tempered Glass")
        specs.setdefault("max_gpu_length", "")
    return specs


async def seed():
    settings = get_settings()
    client = AsyncIOMotorClient(settings.MONGODB_URL, tlsCAFile=certifi.where())
    db = client[settings.DB_NAME]

    await db.users.delete_many({})
    await db.inventory.delete_many({})
    await db.tickets.delete_many({})
    await db.customers.delete_many({})
    await db.suppliers.delete_many({})
    await db.sales_orders.delete_many({})
    await db.purchase_orders.delete_many({})
    await db.warranties.delete_many({})

    print("🗑️  Cleared existing data")

    now = datetime.now(timezone.utc)
    users = [
        {"username": "admin", "password_hash": pwd_context.hash("admin123"), "full_name": "Nguyễn Văn Admin", "role": "admin", "created_at": now, "updated_at": now},
        {"username": "techguy", "password_hash": pwd_context.hash("tech123"), "full_name": "Trần Minh Kỹ Thuật", "role": "technician", "created_at": now, "updated_at": now},
        {"username": "salesperson", "password_hash": pwd_context.hash("sales123"), "full_name": "Lê Thị Bán Hàng", "role": "sales", "created_at": now, "updated_at": now},
    ]

    result = await db.users.insert_many(users)
    tech_id = str(result.inserted_ids[1])
    print(f"👤 Created {len(users)} users (admin/admin123, techguy/tech123, salesperson/sales123)")

    inventory_items = [
        {"sku_code": "CPU-001", "name": "AMD Ryzen 5 5600X", "category": "CPU", "brand": "AMD", "image_url": local_image_url("CPU-001"), "specs": build_specs("CPU", "AMD Ryzen 5 5600X", {"socket": "AM4", "cores": 6, "threads": 12, "base_clock": "3.7GHz", "boost_clock": "4.6GHz", "l2_cache": "3MB", "l3_cache": "32MB", "tdp": 65, "process": "TSMC 7nm", "package": "Boxed", "supports_overclock": "Yes"}), "stock_quantity": 15, "unit_price": 4500000},
        {"sku_code": "CPU-002", "name": "Intel Core i7-13700K", "category": "CPU", "brand": "Intel", "image_url": local_image_url("CPU-002"), "specs": build_specs("CPU", "Intel Core i7-13700K", {"socket": "LGA1700", "cores": 16, "threads": 24, "base_clock": "3.4GHz", "boost_clock": "5.4GHz", "l2_cache": "24MB", "l3_cache": "30MB", "tdp": 125, "process": "Intel 7", "package": "Boxed", "supports_overclock": "Yes"}), "stock_quantity": 8, "unit_price": 9200000},
        {"sku_code": "CPU-003", "name": "AMD Ryzen 9 7950X", "category": "CPU", "brand": "AMD", "image_url": local_image_url("CPU-003"), "specs": build_specs("CPU", "AMD Ryzen 9 7950X", {"socket": "AM5", "cores": 16, "threads": 32, "base_clock": "4.5GHz", "boost_clock": "5.7GHz", "l2_cache": "16MB", "l3_cache": "64MB", "tdp": 170, "process": "TSMC 5nm", "package": "Boxed", "supports_overclock": "Yes"}), "stock_quantity": 3, "unit_price": 14500000},
        {"sku_code": "GPU-001", "name": "NVIDIA RTX 4060 Ti", "category": "GPU", "brand": "NVIDIA", "image_url": local_image_url("GPU-001"), "specs": build_specs("GPU", "NVIDIA RTX 4060 Ti", {"vram": "8GB GDDR6X", "cuda_cores": 4352, "boost_clock": "2535MHz", "power": "160W", "interface": "PCIe 4.0 x8", "architecture": "Ada Lovelace", "memory_bus": "128-bit", "recommended_psu": "550W"}), "stock_quantity": 12, "unit_price": 10500000},
        {"sku_code": "GPU-002", "name": "AMD RX 7800 XT", "category": "GPU", "brand": "AMD", "image_url": local_image_url("GPU-002"), "specs": build_specs("GPU", "AMD RX 7800 XT", {"vram": "16GB GDDR6", "stream_processors": 3840, "boost_clock": "2430MHz", "power": "263W", "interface": "PCIe 4.0 x16", "architecture": "RDNA 3", "memory_bus": "256-bit", "recommended_psu": "700W"}), "stock_quantity": 5, "unit_price": 12000000},
        {"sku_code": "GPU-003", "name": "NVIDIA RTX 4090", "category": "GPU", "brand": "NVIDIA", "image_url": local_image_url("GPU-003"), "specs": build_specs("GPU", "NVIDIA RTX 4090", {"vram": "24GB GDDR6X", "cuda_cores": 16384, "boost_clock": "2520MHz", "power": "450W", "interface": "PCIe 4.0 x16", "architecture": "Ada Lovelace", "memory_bus": "384-bit", "recommended_psu": "850W"}), "stock_quantity": 2, "unit_price": 45000000},
        {"sku_code": "RAM-001", "name": "Kingston Fury Beast DDR4 16GB", "category": "RAM", "brand": "Kingston", "image_url": local_image_url("RAM-001"), "specs": build_specs("RAM", "Kingston Fury Beast DDR4 16GB", {"bus": 3200, "capacity": "16GB", "type": "DDR4", "latency": "CL16", "voltage": "1.35V", "form_factor": "UDIMM", "rgb": "No", "xmp_expo": "XMP 2.0"}), "stock_quantity": 25, "unit_price": 950000},
        {"sku_code": "RAM-002", "name": "Corsair Vengeance DDR5 32GB", "category": "RAM", "brand": "Corsair", "image_url": local_image_url("RAM-002"), "specs": build_specs("RAM", "Corsair Vengeance DDR5 32GB", {"bus": 5600, "capacity": "32GB (2x16GB)", "type": "DDR5", "latency": "CL36", "voltage": "1.25V", "form_factor": "UDIMM", "rgb": "No", "xmp_expo": "XMP 3.0"}), "stock_quantity": 10, "unit_price": 2800000},
        {"sku_code": "RAM-003", "name": "G.Skill Trident Z5 RGB DDR5 32GB", "category": "RAM", "brand": "G.Skill", "image_url": local_image_url("RAM-003"), "specs": build_specs("RAM", "G.Skill Trident Z5 RGB DDR5 32GB", {"bus": 6000, "capacity": "32GB (2x16GB)", "type": "DDR5", "latency": "CL30", "voltage": "1.35V", "form_factor": "UDIMM", "rgb": "Yes", "xmp_expo": "XMP 3.0"}), "stock_quantity": 0, "unit_price": 3500000},
        {"sku_code": "SSD-001", "name": "Samsung 980 PRO 1TB", "category": "Storage", "brand": "Samsung", "image_url": local_image_url("SSD-001"), "specs": build_specs("Storage", "Samsung 980 PRO 1TB", {"capacity": "1TB", "type": "NVMe M.2", "read_speed": "7000MB/s", "write_speed": "5000MB/s", "interface": "PCIe 4.0 x4", "form_factor": "M.2 2280", "endurance": "600 TBW", "warranty": "5 years"}), "stock_quantity": 20, "unit_price": 2500000},
        {"sku_code": "SSD-002", "name": "WD Black SN850X 2TB", "category": "Storage", "brand": "WD", "image_url": local_image_url("SSD-002"), "specs": build_specs("Storage", "WD Black SN850X 2TB", {"capacity": "2TB", "type": "NVMe M.2", "read_speed": "7300MB/s", "write_speed": "6600MB/s", "interface": "PCIe 4.0 x4", "form_factor": "M.2 2280", "endurance": "1200 TBW", "warranty": "5 years"}), "stock_quantity": 4, "unit_price": 4200000},
        {"sku_code": "HDD-001", "name": "Seagate BarraCuda 2TB", "category": "Storage", "brand": "Seagate", "image_url": local_image_url("HDD-001"), "specs": build_specs("Storage", "Seagate BarraCuda 2TB", {"capacity": "2TB", "type": "HDD 3.5\"", "speed": "7200RPM", "cache": "256MB", "interface": "SATA III", "form_factor": "3.5-inch", "endurance": "N/A", "warranty": "2 years"}), "stock_quantity": 30, "unit_price": 1300000},
        {"sku_code": "MB-001", "name": "ASUS ROG STRIX B550-F Gaming", "category": "Mainboard", "brand": "ASUS", "image_url": local_image_url("MB-001"), "specs": build_specs("Mainboard", "ASUS ROG STRIX B550-F Gaming", {"socket": "AM4", "chipset": "B550", "form_factor": "ATX", "ram_slots": 4, "max_ram": "128GB DDR4", "memory_support": "DDR4 4400+(OC)", "storage_slots": "2x M.2 + 6x SATA", "network": "2.5GbE + Wi-Fi 6"}), "stock_quantity": 7, "unit_price": 4200000},
        {"sku_code": "MB-002", "name": "MSI MAG Z790 TOMAHAWK WiFi", "category": "Mainboard", "brand": "MSI", "image_url": local_image_url("MB-002"), "specs": build_specs("Mainboard", "MSI MAG Z790 TOMAHAWK WiFi", {"socket": "LGA1700", "chipset": "Z790", "form_factor": "ATX", "ram_slots": 4, "max_ram": "128GB DDR5", "memory_support": "DDR5 7200+(OC)", "storage_slots": "4x M.2 + 6x SATA", "network": "2.5GbE + Wi-Fi 6E"}), "stock_quantity": 1, "unit_price": 7500000},
        {"sku_code": "PSU-001", "name": "Corsair RM850x 850W", "category": "PSU", "brand": "Corsair", "image_url": local_image_url("PSU-001"), "specs": build_specs("PSU", "Corsair RM850x 850W", {"wattage": 850, "efficiency": "80+ Gold", "modular": "Full", "fan_size": "135mm", "form_factor": "ATX", "rail": "+12V Single Rail", "protections": "OVP/UVP/OCP/OPP/SCP/OTP"}), "stock_quantity": 10, "unit_price": 3200000},
        {"sku_code": "PSU-002", "name": "Seasonic Focus GX-1000 1000W", "category": "PSU", "brand": "Seasonic", "image_url": local_image_url("PSU-002"), "specs": build_specs("PSU", "Seasonic Focus GX-1000 1000W", {"wattage": 1000, "efficiency": "80+ Gold", "modular": "Full", "fan_size": "120mm", "form_factor": "ATX", "rail": "+12V Single Rail", "protections": "OVP/UVP/OCP/OPP/SCP/OTP"}), "stock_quantity": 6, "unit_price": 4500000},
        {"sku_code": "CASE-001", "name": "NZXT H510 Flow", "category": "Other", "brand": "NZXT", "image_url": local_image_url("CASE-001"), "specs": build_specs("Other", "NZXT H510 Flow", {"type": "Mid Tower", "material": "Steel/Tempered Glass", "max_gpu_length": "381mm", "fans_included": 2, "panel": "Tempered Glass"}), "stock_quantity": 8, "unit_price": 2200000},
        {"sku_code": "FAN-001", "name": "Noctua NH-D15", "category": "Cooling", "brand": "Noctua", "image_url": local_image_url("FAN-001"), "specs": build_specs("Cooling", "Noctua NH-D15", {"type": "Air Cooler", "fan_count": 2, "tdp_rating": "250W", "noise_level": "24.6 dBA", "socket_support": "AMD AM4/AM5, Intel LGA1700", "airflow": "82.5 CFM"}), "stock_quantity": 15, "unit_price": 2300000},
    ]

    for item in inventory_items:
        if not item.get("image_url"):
            item["image_url"] = local_image_url(item["sku_code"])
        item["status"] = compute_stock_status(item["stock_quantity"]).value
        item["created_at"] = now - timedelta(days=30)
        item["updated_at"] = now

    await db.inventory.insert_many(inventory_items)
    print(f"📦 Created {len(inventory_items)} inventory items")

    tickets = [
        {"ticket_id": "TKT-1001", "customer_info": {"name": "Phạm Hồng Sơn", "phone": "0901234567"}, "device_info": "Dell XPS 15 9500", "issue_description": "Laptop không khởi động, đèn nguồn nhấp nháy. Nghi ngờ lỗi RAM hoặc mainboard.", "status": "pending", "technician_id": tech_id, "technician_name": "Trần Minh Kỹ Thuật", "parts_used": [], "total_cost": 0, "created_at": now - timedelta(days=5), "updated_at": now - timedelta(days=5)},
        {"ticket_id": "TKT-1002", "customer_info": {"name": "Ngô Thanh Tùng", "phone": "0912345678"}, "device_info": "PC Custom Build - Gaming", "issue_description": "Máy tự tắt khi chơi game nặng. Kiểm tra PSU và nhiệt độ GPU.", "status": "diagnosing", "technician_id": tech_id, "technician_name": "Trần Minh Kỹ Thuật", "parts_used": [], "total_cost": 0, "created_at": now - timedelta(days=4), "updated_at": now - timedelta(days=3)},
        {"ticket_id": "TKT-1003", "customer_info": {"name": "Lý Minh Châu", "phone": "0923456789"}, "device_info": "ASUS TUF Gaming F15", "issue_description": "Màn hình bị sọc dọc, đôi khi mất hình hoàn toàn.", "status": "waiting_parts", "technician_id": tech_id, "technician_name": "Trần Minh Kỹ Thuật", "parts_used": [], "total_cost": 0, "created_at": now - timedelta(days=7), "updated_at": now - timedelta(days=2)},
        {"ticket_id": "TKT-1004", "customer_info": {"name": "Đỗ Văn Hải", "phone": "0934567890"}, "device_info": "HP ProBook 450 G8", "issue_description": "Nâng cấp RAM từ 8GB lên 16GB và thay SSD.", "status": "completed", "technician_id": tech_id, "technician_name": "Trần Minh Kỹ Thuật", "parts_used": [{"inventory_id": "placeholder", "name": "Kingston Fury Beast DDR4 16GB", "quantity": 1, "price": 950000}, {"inventory_id": "placeholder", "name": "Samsung 980 PRO 1TB", "quantity": 1, "price": 2500000}], "total_cost": 3450000, "created_at": now - timedelta(days=10), "updated_at": now - timedelta(days=6)},
        {"ticket_id": "TKT-1005", "customer_info": {"name": "Võ Thị Hương", "phone": "0945678901"}, "device_info": "Lenovo ThinkPad X1 Carbon", "issue_description": "Bàn phím một số phím không hoạt động. Cần thay bàn phím mới.", "status": "completed", "technician_id": tech_id, "technician_name": "Trần Minh Kỹ Thuật", "parts_used": [], "total_cost": 1500000, "created_at": now - timedelta(days=15), "updated_at": now - timedelta(days=12)},
        {"ticket_id": "TKT-1006", "customer_info": {"name": "Bùi Quốc Dũng", "phone": "0956789012"}, "device_info": "PC Workstation - Rendering", "issue_description": "Build PC mới cho rendering 3D. Yêu cầu cấu hình cao với RTX 4090.", "status": "pending", "technician_id": None, "technician_name": None, "parts_used": [], "total_cost": 0, "created_at": now - timedelta(days=1), "updated_at": now - timedelta(days=1)},
        {"ticket_id": "TKT-1007", "customer_info": {"name": "Trương Gia Hân", "phone": "0967890123"}, "device_info": "MSI GF63 Thin", "issue_description": "Laptop quá nóng, quạt kêu to. Cần vệ sinh và thay keo tản nhiệt.", "status": "diagnosing", "technician_id": tech_id, "technician_name": "Trần Minh Kỹ Thuật", "parts_used": [], "total_cost": 0, "created_at": now - timedelta(days=2), "updated_at": now - timedelta(days=1)},
        {"ticket_id": "TKT-1008", "customer_info": {"name": "Hoàng Minh Đức", "phone": "0978901234"}, "device_info": "Acer Nitro 5", "issue_description": "SSD bị bad sector, cần backup dữ liệu và thay SSD mới.", "status": "completed", "technician_id": tech_id, "technician_name": "Trần Minh Kỹ Thuật", "parts_used": [{"inventory_id": "placeholder", "name": "Samsung 980 PRO 1TB", "quantity": 1, "price": 2500000}], "total_cost": 2500000, "created_at": now - timedelta(days=20), "updated_at": now - timedelta(days=16)},
        {"ticket_id": "TKT-1009", "customer_info": {"name": "Phan Thị Mai", "phone": "0989012345"}, "device_info": "PC Văn phòng", "issue_description": "Máy chậm, cần nâng cấp RAM và cài đặt lại Windows.", "status": "waiting_parts", "technician_id": tech_id, "technician_name": "Trần Minh Kỹ Thuật", "parts_used": [], "total_cost": 0, "created_at": now - timedelta(days=3), "updated_at": now - timedelta(days=2)},
        {"ticket_id": "TKT-1010", "customer_info": {"name": "Đinh Công Thành", "phone": "0990123456"}, "device_info": "Custom Gaming PC", "issue_description": "Nâng cấp GPU từ GTX 1660 lên RTX 4060 Ti và thêm PSU mới.", "status": "completed", "technician_id": tech_id, "technician_name": "Trần Minh Kỹ Thuật", "parts_used": [{"inventory_id": "placeholder", "name": "NVIDIA RTX 4060 Ti", "quantity": 1, "price": 10500000}, {"inventory_id": "placeholder", "name": "Corsair RM850x 850W", "quantity": 1, "price": 3200000}], "total_cost": 13700000, "created_at": now - timedelta(days=25), "updated_at": now - timedelta(days=20)},
    ]

    await db.tickets.insert_many(tickets)
    print(f"🔧 Created {len(tickets)} maintenance tickets")

    customers = [
        {"code": "KH-0001", "name": "Nguyễn Hoàng Nam", "phone": "0909000001", "email": "nam@example.com", "address": "Hà Nội", "type": "individual", "total_spent": 14500000, "order_count": 2, "created_at": now, "updated_at": now},
        {"code": "KH-0002", "name": "Công ty Tân Phát", "phone": "0909000002", "email": "contact@tanphat.vn", "address": "TP. HCM", "type": "business", "total_spent": 42000000, "order_count": 5, "created_at": now, "updated_at": now},
    ]
    suppliers = [
        {"code": "NCC-0001", "name": "TechSource VN", "contact": {"person": "Anh Tuấn", "phone": "0888000001", "email": "sales@techsource.vn"}, "address": "Bình Dương", "notes": "Nhà cung cấp CPU/GPU", "rating": 4.8, "total_orders": 18, "status": "active", "created_at": now, "updated_at": now},
        {"code": "NCC-0002", "name": "Memory Pro", "contact": {"person": "Chị Hạnh", "phone": "0888000002", "email": "hello@memorypro.vn"}, "address": "TP. HCM", "notes": "RAM và SSD", "rating": 4.6, "total_orders": 12, "status": "active", "created_at": now, "updated_at": now},
    ]
    await db.customers.insert_many(customers)
    await db.suppliers.insert_many(suppliers)

    cpu = await db.inventory.find_one({"sku_code": "CPU-001"})
    ram = await db.inventory.find_one({"sku_code": "RAM-001"})
    gpu = await db.inventory.find_one({"sku_code": "GPU-001"})
    psu = await db.inventory.find_one({"sku_code": "PSU-001"})

    sales_orders = [{"invoice_number": "INV-0001", "customer_id": str(result.inserted_ids[0]), "customer_name": customers[0]["name"], "customer_phone": customers[0]["phone"], "items": [{"inventory_id": str(cpu["_id"]), "name": cpu["name"], "quantity": 1, "unit_price": cpu["unit_price"], "discount": 0}, {"inventory_id": str(ram["_id"]), "name": ram["name"], "quantity": 2, "unit_price": ram["unit_price"], "discount": 0}], "subtotal": cpu["unit_price"] + ram["unit_price"] * 2, "discount_total": 0, "total_amount": cpu["unit_price"] + ram["unit_price"] * 2, "payment_method": "cash", "status": "confirmed", "sold_by": tech_id, "sold_by_name": "Trần Minh Kỹ Thuật", "notes": "", "created_at": now - timedelta(days=6), "updated_at": now - timedelta(days=6)}]
    purchase_orders = [{"po_number": "PO-0001", "supplier_id": None, "supplier_name": suppliers[0]["name"], "items": [{"inventory_id": str(gpu["_id"]), "name": gpu["name"], "quantity": 2, "unit_cost": gpu["unit_price"] * 0.9}, {"inventory_id": str(psu["_id"]), "name": psu["name"], "quantity": 2, "unit_cost": psu["unit_price"] * 0.85}], "total_amount": int(gpu["unit_price"] * 0.9 * 2 + psu["unit_price"] * 0.85 * 2), "status": "received", "received_by": tech_id, "received_by_name": "Trần Minh Kỹ Thuật", "notes": "", "created_at": now - timedelta(days=8), "updated_at": now - timedelta(days=8)}]
    warranties = [{"warranty_code": "BH-0001", "sales_order_id": "INV-0001", "customer_id": str(result.inserted_ids[0]), "customer_name": customers[0]["name"], "inventory_id": str(cpu["_id"]), "serial_number": "SN-0001", "product_name": cpu["name"], "purchase_date": now - timedelta(days=30), "warranty_months": 24, "expiry_date": now + timedelta(days=720), "status": "active", "claims": [], "created_at": now, "updated_at": now}]
    await db.sales_orders.insert_many(sales_orders)
    await db.purchase_orders.insert_many(purchase_orders)
    await db.warranties.insert_many(warranties)

    await db.users.create_index("username", unique=True)
    await db.inventory.create_index("sku_code", unique=True)
    await db.tickets.create_index("ticket_id", unique=True)

    print("\n✅ Database seeded successfully!")
    print("──────────────────────────────────")
    print("Login credentials:")
    print("  Admin:      admin / admin123")
    print("  Technician: techguy / tech123")
    print("  Sales:      salesperson / sales123")
    print("──────────────────────────────────")

    client.close()


if __name__ == "__main__":
    asyncio.run(seed())

