# Copyright (C) 2026 gbao86 <tiktokthu10@gmail.com>
# This file is part of the chims project.
# Licensed under the GNU General Public License v3.0; see LICENSE for details.
from fastapi import APIRouter, Depends, HTTPException, Query, status
from bson import ObjectId
from datetime import datetime, timezone
from typing import Optional

from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.serial_unit import (
    SerialUnitCreate,
    SerialUnitBulkCreate,
    SerialUnitUpdate,
    SerialStatus,
    ItemCondition,
)

router = APIRouter()


async def _enrich_serial(db, doc: dict) -> dict:
    """Enrich serial unit with product and warehouse info."""
    product_name = ""
    sku_code = ""
    category = ""
    if doc.get("inventory_id"):
        try:
            inv = await db.inventory.find_one({"_id": ObjectId(doc["inventory_id"])})
            if inv:
                product_name = inv.get("name", "")
                sku_code = inv.get("sku_code", "")
                category = inv.get("category", "")
        except Exception:
            pass

    warehouse_name = ""
    if doc.get("warehouse_id"):
        try:
            wh = await db.warehouses.find_one({"_id": ObjectId(doc["warehouse_id"])})
            if wh:
                warehouse_name = wh.get("name", "")
        except Exception:
            pass

    return {
        "id": str(doc["_id"]),
        "serial_number": doc["serial_number"],
        "inventory_id": doc.get("inventory_id", ""),
        "product_name": product_name,
        "sku_code": sku_code,
        "category": category,
        "condition": doc.get("condition", "new"),
        "status": doc.get("status", "available"),
        "purchase_order_id": doc.get("purchase_order_id", ""),
        "warehouse_id": doc.get("warehouse_id", ""),
        "warehouse_name": warehouse_name,
        "location_code": doc.get("location_code", ""),
        "sold_to_order_id": doc.get("sold_to_order_id", ""),
        "warranty_id": doc.get("warranty_id", ""),
        "build_id": doc.get("build_id", ""),
        "notes": doc.get("notes", ""),
        "created_at": doc["created_at"],
        "updated_at": doc["updated_at"],
    }


@router.get("")
async def list_serial_units(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    inventory_id: Optional[str] = None,
    status_filter: Optional[SerialStatus] = Query(None, alias="status"),
    condition: Optional[ItemCondition] = None,
    warehouse_id: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    """List serial units with filtering."""
    db = get_db()
    query = {}

    if inventory_id:
        query["inventory_id"] = inventory_id
    if status_filter:
        query["status"] = status_filter.value
    if condition:
        query["condition"] = condition.value
    if warehouse_id:
        query["warehouse_id"] = warehouse_id
    if search:
        query["$or"] = [
            {"serial_number": {"$regex": search, "$options": "i"}},
        ]

    skip = (page - 1) * limit
    total = await db.serial_units.count_documents(query)
    cursor = db.serial_units.find(query).skip(skip).limit(limit).sort("created_at", -1)

    items = []
    async for doc in cursor:
        items.append(await _enrich_serial(db, doc))

    return {"items": items, "total": total, "page": page, "limit": limit}


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_serial_unit(
    data: SerialUnitCreate,
    current_user: dict = Depends(get_current_user),
):
    """Create a single serial unit."""
    db = get_db()

    # Check duplicate serial
    existing = await db.serial_units.find_one({"serial_number": data.serial_number})
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Serial number '{data.serial_number}' already exists",
        )

    # Verify inventory exists
    try:
        inv = await db.inventory.find_one({"_id": ObjectId(data.inventory_id)})
        if not inv:
            raise HTTPException(status_code=404, detail="Inventory item not found")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid inventory ID")

    now = datetime.now(timezone.utc)
    doc = {
        "serial_number": data.serial_number,
        "inventory_id": data.inventory_id,
        "condition": data.condition.value,
        "status": SerialStatus.AVAILABLE.value,
        "purchase_order_id": data.purchase_order_id,
        "warehouse_id": data.warehouse_id,
        "location_code": data.location_code,
        "sold_to_order_id": "",
        "warranty_id": "",
        "build_id": "",
        "notes": data.notes,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.serial_units.insert_one(doc)
    doc["_id"] = result.inserted_id

    # Update inventory stock count
    available_count = await db.serial_units.count_documents(
        {"inventory_id": data.inventory_id, "status": SerialStatus.AVAILABLE.value}
    )
    from app.models.inventory import compute_stock_status
    await db.inventory.update_one(
        {"_id": ObjectId(data.inventory_id)},
        {"$set": {
            "stock_quantity": available_count,
            "status": compute_stock_status(available_count, inv.get("min_stock", 5)).value,
            "updated_at": now,
        }},
    )

    return await _enrich_serial(db, doc)


@router.post("/bulk", status_code=status.HTTP_201_CREATED)
async def bulk_create_serial_units(
    data: SerialUnitBulkCreate,
    current_user: dict = Depends(get_current_user),
):
    """Create multiple serial units at once."""
    db = get_db()

    # Verify inventory exists
    try:
        inv = await db.inventory.find_one({"_id": ObjectId(data.inventory_id)})
        if not inv:
            raise HTTPException(status_code=404, detail="Inventory item not found")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid inventory ID")

    # Check for duplicates
    existing = await db.serial_units.find(
        {"serial_number": {"$in": data.serial_numbers}}
    ).to_list(None)
    existing_serials = {d["serial_number"] for d in existing}
    duplicates = [s for s in data.serial_numbers if s in existing_serials]
    if duplicates:
        raise HTTPException(
            status_code=400,
            detail=f"Duplicate serial numbers: {', '.join(duplicates[:5])}",
        )

    now = datetime.now(timezone.utc)
    docs = []
    for serial in data.serial_numbers:
        docs.append({
            "serial_number": serial,
            "inventory_id": data.inventory_id,
            "condition": data.condition.value,
            "status": SerialStatus.AVAILABLE.value,
            "purchase_order_id": data.purchase_order_id,
            "warehouse_id": data.warehouse_id,
            "location_code": data.location_code,
            "sold_to_order_id": "",
            "warranty_id": "",
            "build_id": "",
            "notes": "",
            "created_at": now,
            "updated_at": now,
        })

    if docs:
        await db.serial_units.insert_many(docs)

    # Update inventory stock count
    available_count = await db.serial_units.count_documents(
        {"inventory_id": data.inventory_id, "status": SerialStatus.AVAILABLE.value}
    )
    from app.models.inventory import compute_stock_status
    await db.inventory.update_one(
        {"_id": ObjectId(data.inventory_id)},
        {"$set": {
            "stock_quantity": available_count,
            "status": compute_stock_status(available_count, inv.get("min_stock", 5)).value,
            "updated_at": now,
        }},
    )

    return {"created": len(docs), "inventory_id": data.inventory_id}


@router.get("/scan")
async def scan_serial(
    code: str = Query(..., description="Barcode or QR code string"),
    current_user: dict = Depends(get_current_user),
):
    """Look up serial unit by scanned barcode/QR code."""
    db = get_db()
    doc = await db.serial_units.find_one({"serial_number": code})
    if not doc:
        # Try barcode in inventory
        inv = await db.inventory.find_one({"barcode": code})
        if inv:
            return {"found": "inventory", "inventory_id": str(inv["_id"]), "name": inv["name"]}
        raise HTTPException(status_code=404, detail="Serial/barcode not found")

    return {"found": "serial_unit", "data": await _enrich_serial(db, doc)}


@router.get("/{serial_id}")
async def get_serial_unit(
    serial_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get serial unit by ID or serial number."""
    db = get_db()

    doc = None
    try:
        doc = await db.serial_units.find_one({"_id": ObjectId(serial_id)})
    except Exception:
        pass

    if not doc:
        doc = await db.serial_units.find_one({"serial_number": serial_id})

    if not doc:
        raise HTTPException(status_code=404, detail="Serial unit not found")

    return await _enrich_serial(db, doc)


@router.put("/{serial_id}")
async def update_serial_unit(
    serial_id: str,
    update: SerialUnitUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Update a serial unit."""
    db = get_db()

    try:
        oid = ObjectId(serial_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid serial unit ID")

    existing = await db.serial_units.find_one({"_id": oid})
    if not existing:
        raise HTTPException(status_code=404, detail="Serial unit not found")

    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if isinstance(update_data.get("condition"), ItemCondition):
        update_data["condition"] = update_data["condition"].value
    if isinstance(update_data.get("status"), SerialStatus):
        update_data["status"] = update_data["status"].value
    update_data["updated_at"] = datetime.now(timezone.utc)

    await db.serial_units.update_one({"_id": oid}, {"$set": update_data})

    # Recalculate stock if status changed
    if "status" in update_data:
        inv_id = existing["inventory_id"]
        available_count = await db.serial_units.count_documents(
            {"inventory_id": inv_id, "status": SerialStatus.AVAILABLE.value}
        )
        try:
            inv = await db.inventory.find_one({"_id": ObjectId(inv_id)})
            if inv:
                from app.models.inventory import compute_stock_status
                await db.inventory.update_one(
                    {"_id": ObjectId(inv_id)},
                    {"$set": {
                        "stock_quantity": available_count,
                        "status": compute_stock_status(available_count, inv.get("min_stock", 5)).value,
                        "updated_at": datetime.now(timezone.utc),
                    }},
                )
        except Exception:
            pass

    updated = await db.serial_units.find_one({"_id": oid})
    return await _enrich_serial(db, updated)

