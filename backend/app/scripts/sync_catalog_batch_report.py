import asyncio
import json
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.append(str(ROOT))

from app.database import connect_db, close_db, get_db  # noqa: E402
from app.services.catalog_sync import CatalogSyncService  # noqa: E402

REPORT_PATH = ROOT / "catalog_sync_report.json"


async def main():
    started = time.perf_counter()
    print("[report] connecting database...")
    await connect_db()
    db = get_db()
    service = CatalogSyncService()
    cursor = db.inventory.find({"status": {"$in": ["out_of_stock", "low_stock", "in_stock"]}}, {"sku_code": 1, "name": 1, "category": 1, "brand": 1, "specs": 1, "image_url": 1, "image_urls": 1})
    items = []
    async for item in cursor:
        items.append(item)

    summary = {"total": len(items), "matched": 0, "failed": 0, "images_downloaded": 0, "specs_found": 0}
    results = []

    for idx, item in enumerate(items, start=1):
        sku = item.get("sku_code", "UNKNOWN")
        name = item.get("name", "")
        print(f"[report] ({idx}/{len(items)}) {sku} | {name}")
        record = {"sku_code": sku, "name": name, "status": "pending", "images": 0, "specs": 0, "reason": ""}
        try:
            sync_result = service.sync_inventory_item(item)
        except Exception as exc:
            summary["failed"] += 1
            record.update({"status": "error", "reason": f"exception: {exc}"})
            results.append(record)
            print(f"[report][fail] {sku} | exception: {exc}")
            continue

        if not sync_result.get("matched"):
            summary["failed"] += 1
            record.update({"status": "no_match", "reason": sync_result.get("reason", "no match")})
            results.append(record)
            print(f"[report][fail] {sku} | {sync_result.get('reason', 'no match')}")
            continue

        patch = service.apply_to_document(item, sync_result)
        try:
            await db.inventory.update_one({"sku_code": sku}, {"$set": patch})
        except Exception as exc:
            summary["failed"] += 1
            record.update({"status": "db_error", "reason": f"db update failed: {exc}"})
            results.append(record)
            print(f"[report][fail] {sku} | db update failed: {exc}")
            continue

        image_count = len(sync_result.get("image_urls", []))
        specs_count = len(sync_result.get("specs", {}))
        summary["matched"] += 1
        summary["images_downloaded"] += image_count
        summary["specs_found"] += specs_count
        record.update({"status": "ok", "images": image_count, "specs": specs_count, "product_url": sync_result.get("product_url")})
        results.append(record)
        print(f"[report][ok] {sku} | images={image_count} | specs={specs_count}")

    elapsed = time.perf_counter() - started
    payload = {"summary": {**summary, "elapsed_seconds": round(elapsed, 1)}, "results": results}
    REPORT_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[report][saved] {REPORT_PATH}")
    print(f"[report][summary] total={summary['total']} matched={summary['matched']} failed={summary['failed']} images={summary['images_downloaded']} specs={summary['specs_found']} elapsed={elapsed:.1f}s")
    await close_db()


if __name__ == "__main__":
    asyncio.run(main())
