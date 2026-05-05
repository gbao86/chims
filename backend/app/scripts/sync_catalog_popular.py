import asyncio
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.append(str(ROOT))

from app.database import connect_db, close_db, get_db  # noqa: E402
from app.services.catalog_sync import CatalogSyncService  # noqa: E402
from app.services.sku_mapping import generate_popular_queries  # noqa: E402


async def main():
    started = time.perf_counter()
    print("[popular] connecting database...")
    await connect_db()
    db = get_db()
    service = CatalogSyncService()
    queries = generate_popular_queries(limit=200)

    summary = {"total": len(queries), "matched": 0, "failed": 0, "images_downloaded": 0, "specs_found": 0}
    for idx, q in enumerate(queries, start=1):
        print(f"[popular] ({idx}/{len(queries)}) {q.sku_code} | {q.query} | {q.category}")
        try:
            sync_result = service.sync_one(q.query)
        except Exception as exc:
            summary["failed"] += 1
            print(f"[popular][fail] {q.sku_code} | exception: {exc}")
            continue

        if not sync_result.get("matched"):
            summary["failed"] += 1
            print(f"[popular][fail] {q.sku_code} | no match")
            continue

        # Update only if this query has a known seed SKU mapping.
        if q.sku_code.startswith(("CPU-", "GPU-", "RAM-", "SSD-", "HDD-", "MB-", "PSU-", "CASE-", "FAN-")):
            await db.inventory.update_one({"sku_code": q.sku_code}, {"$set": service.apply_to_document({"sku_code": q.sku_code}, sync_result)})

        summary["matched"] += 1
        summary["images_downloaded"] += len(sync_result.get("image_urls", []))
        summary["specs_found"] += len(sync_result.get("specs", {}))
        print(f"[popular][ok] {q.sku_code} | images={len(sync_result.get('image_urls', []))} | specs={len(sync_result.get('specs', {}))}")

    elapsed = time.perf_counter() - started
    print(f"[popular][summary] total={summary['total']} matched={summary['matched']} failed={summary['failed']} images={summary['images_downloaded']} specs={summary['specs_found']} elapsed={elapsed:.1f}s")
    await close_db()


if __name__ == "__main__":
    asyncio.run(main())
