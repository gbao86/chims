# Copyright (C) 2026 gbao86 <tiktokthu10@gmail.com>
# This file is part of the chims project.
# Licensed under the GNU General Public License v3.0; see LICENSE for details.
import asyncio
import sys
import json
from pathlib import Path
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[2]
sys.path.append(str(ROOT))

from app.database import connect_db, close_db, get_db
from app.models.inventory import compute_stock_status, InventoryCreate

async def main():
    await connect_db()
    db = get_db()
    
    # Path to kaggle_catalog_200_report_duckduckgo.json at root
    json_path = Path(__file__).resolve().parents[3] / "kaggle_catalog_200_report_duckduckgo.json"
    print(f"Reading from {json_path}")
    
    try:
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        print(f"Error reading JSON file: {e}")
        await close_db()
        return
        
    items = data.get("seed_ready_items", [])
    print(f"Found {len(items)} items to process.")
    
    now = datetime.now(timezone.utc)
    inserted_count = 0
    updated_count = 0
    
    for item in items:
        try:
            # Sử dụng Pydantic model để tự động chuẩn hóa và thêm các trường mặc định 
            # (như min_stock=5, cost_price=0, warranty_months=24)
            valid_item = InventoryCreate(**item)
            doc = valid_item.model_dump()
            
            # Bổ sung các trường quản lý hệ thống
            doc["image_urls"] = doc["image_urls"] or ([doc["image_url"]] if doc["image_url"] else [])
            doc["status"] = compute_stock_status(doc["stock_quantity"]).value
            doc["updated_at"] = now
            
            # Cập nhật hoặc Thêm mới vào MongoDB
            existing = await db.inventory.find_one({"sku_code": doc["sku_code"]})
            if existing:
                await db.inventory.update_one({"_id": existing["_id"]}, {"$set": doc})
                updated_count += 1
            else:
                doc["created_at"] = now
                await db.inventory.insert_one(doc)
                inserted_count += 1
        except Exception as e:
            print(f"Lỗi khi xử lý SKU {item.get('sku_code')}: {e}")
            
    print(f"✅ Hoàn tất! Đã thêm mới {inserted_count} sản phẩm, Cập nhật {updated_count} sản phẩm cũ.")
    await close_db()

if __name__ == "__main__":
    asyncio.run(main())
