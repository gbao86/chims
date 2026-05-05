# Copyright (C) 2026 gbao86 <tiktokthu10@gmail.com>
# This file is part of the chims project.
# Licensed under the GNU General Public License v3.0; see LICENSE for details.
import asyncio
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.append(str(ROOT))

from app.database import connect_db, close_db, get_db  # noqa: E402
from app.services.catalog_sync import CatalogSyncService  # noqa: E402


async def main():
    started = time.perf_counter()
    print("[sync] connecting database...")
    await connect_db()
    db = get_db()
    service = CatalogSyncService()
    cursor = db.inventory.find({}, {"sku_code": 1, "name": 1, "category": 1, "brand": 1, "specs": 1, "image_url": 1, "image_urls": 1})
    items = []
    async for item in cursor:
        items.append(item)

    summary = {"total": len(items), "matched": 0, "failed": 0, "images_downloaded": 0, "specs_found": 0}
    failures = []
    for idx, item in enumerate(items, start=1):
        sku = item.get("sku_code", "UNKNOWN")
        name = item.get("name", "")
        print(f"[sync] ({idx}/{len(items)}) {sku} | {name}")
        try:
            sync_result = service.sync_inventory_item(item)
        except Exception as exc:
            summary["failed"] += 1
            failures.append({"sku_code": sku, "reason": f"exception: {exc}"})
            print(f"[sync][fail] {sku} | exception: {exc}")
            continue

        if not sync_result.get("matched"):
            summary["failed"] += 1
            failures.append({"sku_code": sku, "reason": sync_result.get("reason", "no match")})
            print(f"[sync][fail] {sku} | {sync_result.get('reason', 'no match')}")
            continue

        patch = service.apply_to_document(item, sync_result)
        try:
            await db.inventory.update_one({"sku_code": sku}, {"$set": patch})
        except Exception as exc:
            summary["failed"] += 1
            failures.append({"sku_code": sku, "reason": f"db update failed: {exc}"})
            print(f"[sync][fail] {sku} | db update failed: {exc}")
            continue

        image_count = len(sync_result.get("image_urls", []))
        specs_count = len(sync_result.get("specs", {}))
        summary["matched"] += 1
        summary["images_downloaded"] += image_count
        summary["specs_found"] += specs_count
        print(f"[sync][ok] {sku} | images={image_count} | specs={specs_count} | source={sync_result.get('product_url')}")

    elapsed = time.perf_counter() - started
    print(f"[sync][summary] total={summary['total']} matched={summary['matched']} failed={summary['failed']} images={summary['images_downloaded']} specs={summary['specs_found']} elapsed={elapsed:.1f}s")
    if failures:
        print("[sync][failures]")
        for failure in failures:
            print(f"- {failure['sku_code']}: {failure['reason']}")
    await close_db()


if __name__ == "__main__":
    asyncio.run(main())

