# Copyright (C) 2026 gbao86 <tiktokthu10@gmail.com>
# This file is part of the chims project.
# Licensed under the GNU General Public License v3.0; see LICENSE for details.
from fastapi import APIRouter, Depends, HTTPException, Query, status
from bson import ObjectId
from datetime import datetime, timezone
from typing import Optional

from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.inventory import (
    InventoryCreate,
    InventoryUpdate,
    InventoryResponse,
    Category,
    compute_stock_status,
)

router = APIRouter()


def serialize_inventory(item: dict) -> dict:
    """Convert MongoDB document to response format."""
    return {
        "id": str(item["_id"]),
        "sku_code": item.get("sku_code", ""),
        "name": item.get("name", ""),
        "category": item.get("category", "Other"),
        "brand": item.get("brand", ""),
        "image_url": item.get("image_url", ""),
        "image_urls": item.get("image_urls", ([item.get("image_url", "")] if item.get("image_url") else [])),
        "specs": item.get("specs", {}),
        "stock_quantity": item.get("stock_quantity", 0),
        "min_stock": item.get("min_stock", 5),
        "cost_price": item.get("cost_price", 0),
        "unit_price": item.get("unit_price", 0),
        "warranty_months": item.get("warranty_months", 24),
        "location": item.get("location", ""),
        "barcode": item.get("barcode", ""),
        "status": item.get("status", "in_stock"),
        "created_at": item.get("created_at") or item.get("updated_at"),
        "updated_at": item.get("updated_at") or item.get("created_at"),
    }


@router.get("")
async def list_inventory(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=200),
    category: Optional[Category] = None,
    search: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    """List all inventory items with pagination, category filter, and search."""
    db = get_db()
    query = {}

    if category:
        query["category"] = category.value

    if status:
        query["status"] = status

    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"sku_code": {"$regex": search, "$options": "i"}},
        ]

    skip = (page - 1) * limit
    total = await db.inventory.count_documents(query)

    cursor = db.inventory.find(query).skip(skip).limit(limit).sort("created_at", -1)
    items = []
    async for item in cursor:
        items.append(serialize_inventory(item))

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit,
    }


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_inventory(
    item: InventoryCreate,
    current_user: dict = Depends(get_current_user),
):
    """Create a new inventory item."""
    db = get_db()

    # Check for duplicate SKU
    existing = await db.inventory.find_one({"sku_code": item.sku_code})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"SKU code '{item.sku_code}' already exists",
        )

    now = datetime.now(timezone.utc)
    doc = {
        **item.model_dump(),
        "image_urls": item.image_urls or ([item.image_url] if item.image_url else []),
        "status": compute_stock_status(item.stock_quantity).value,
        "created_at": now,
        "updated_at": now,
    }

    result = await db.inventory.insert_one(doc)
    doc["_id"] = result.inserted_id

    return serialize_inventory(doc)


@router.get("/overstock-alerts")
async def get_overstock_alerts(current_user: dict = Depends(get_current_user)):
    """List inventory items that might be overstocked (in stock for > 90 days)."""
    db = get_db()
    from datetime import timedelta
    ninety_days_ago = datetime.now(timezone.utc) - timedelta(days=90)
    
    pipeline = [
        {"$match": {"status": "available", "created_at": {"$lte": ninety_days_ago}}},
        {"$group": {"_id": "$inventory_id", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 20}
    ]
    cursor = await db.serial_units.aggregate(pipeline)
    alerts = []
    async for doc in cursor:
        inv_id = doc["_id"]
        count = doc["count"]
        try:
            inv = await db.inventory.find_one({"_id": ObjectId(inv_id)})
            if inv:
                alerts.append({
                    "inventory_id": str(inv["_id"]),
                    "sku_code": inv["sku_code"],
                    "name": inv["name"],
                    "category": inv["category"],
                    "overstock_quantity": count,
                    "days_in_stock": 90,
                })
        except Exception:
            pass
            
    return {"alerts": alerts}


@router.get("/liquidation-candidates")
async def get_liquidation_candidates(current_user: dict = Depends(get_current_user)):
    """List items that are candidates for liquidation."""
    db = get_db()
    from datetime import timedelta
    half_year_ago = datetime.now(timezone.utc) - timedelta(days=180)
    
    pipeline = [
        {"$match": {"status": "available", "created_at": {"$lte": half_year_ago}}},
        {"$group": {"_id": "$inventory_id", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    cursor = await db.serial_units.aggregate(pipeline)
    candidates = []
    async for doc in cursor:
        inv_id = doc["_id"]
        count = doc["count"]
        try:
            inv = await db.inventory.find_one({"_id": ObjectId(inv_id)})
            if inv:
                candidates.append({
                    "inventory_id": str(inv["_id"]),
                    "sku_code": inv["sku_code"],
                    "name": inv["name"],
                    "category": inv["category"],
                    "stock_quantity": count,
                    "suggested_discount": 20.0,
                })
        except Exception:
            pass
            
    return {"candidates": candidates}


@router.put("/{item_id}")
async def update_inventory(
    item_id: str,
    update: InventoryUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Update an inventory item."""
    db = get_db()

    try:
        oid = ObjectId(item_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid item ID"
        )

    existing = await db.inventory.find_one({"_id": oid})
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Item not found"
        )

    raw = update.model_dump()
    update_data = {k: v for k, v in raw.items() if v is not None}

    # Handle image_urls explicitly (even if empty list was sent)
    if raw.get("image_urls") is not None:
        update_data["image_urls"] = raw["image_urls"]
        if raw["image_urls"]:
            update_data["image_url"] = raw["image_urls"][0]
    elif update_data.get("image_url"):
        update_data.setdefault("image_urls", [update_data["image_url"]])

    update_data["updated_at"] = datetime.now(timezone.utc)


    # Recompute stock status if quantity changed
    if "stock_quantity" in update_data:
        update_data["status"] = compute_stock_status(
            update_data["stock_quantity"]
        ).value

    await db.inventory.update_one({"_id": oid}, {"$set": update_data})

    updated = await db.inventory.find_one({"_id": oid})
    return serialize_inventory(updated)


@router.delete("/{item_id}")
async def delete_inventory(
    item_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Delete an inventory item."""
    db = get_db()

    try:
        oid = ObjectId(item_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid item ID"
        )

    result = await db.inventory.delete_one({"_id": oid})

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Item not found"
        )

    return {"message": "Item deleted successfully"}


