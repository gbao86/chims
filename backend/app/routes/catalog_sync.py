# Copyright (C) 2026 gbao86 <tiktokthu10@gmail.com>
# This file is part of the chims project.
# Licensed under the GNU General Public License v3.0; see LICENSE for details.
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.services.catalog_sync import CatalogSyncService

router = APIRouter()
service = CatalogSyncService()


class SyncRequest(BaseModel):
    query: str


@router.post("/sync")
async def sync_catalog_item(payload: SyncRequest, current_user: dict = Depends(get_current_user)):
    result = service.sync_one(payload.query)
    if not result.get("matched"):
        raise HTTPException(status_code=404, detail="No matching product found")
    return result


@router.post("/sync-all")
async def sync_all_catalog(current_user: dict = Depends(get_current_user)):
    db = get_db()
    cursor = db.inventory.find({}, {"sku_code": 1, "name": 1, "category": 1, "brand": 1, "specs": 1, "image_url": 1, "image_urls": 1})
    results = []
    summary = {"total": 0, "matched": 0, "failed": 0, "images_downloaded": 0}
    async for item in cursor:
        summary["total"] += 1
        sync_result = service.sync_inventory_item(item)
        if sync_result.get("matched"):
            patch = service.apply_to_document(item, sync_result)
            await db.inventory.update_one({"sku_code": item["sku_code"]}, {"$set": patch})
            results.append({"sku_code": item["sku_code"], "matched": True, **patch})
            summary["matched"] += 1
            summary["images_downloaded"] += len(sync_result.get("image_urls", []))
        else:
            results.append({"sku_code": item["sku_code"], "matched": False})
            summary["failed"] += 1
    return {"summary": summary, "results": results}

