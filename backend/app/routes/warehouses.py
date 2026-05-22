# Copyright (C) 2026 gbao86 <tiktokthu10@gmail.com>
# This file is part of the chims project.
# Licensed under the GNU General Public License v3.0; see LICENSE for details.
from fastapi import APIRouter, Depends, HTTPException, Query, status
from bson import ObjectId
from datetime import datetime, timezone
from typing import Optional

from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.warehouse import WarehouseCreate, WarehouseUpdate, WarehouseLocationCreate, WarehouseLocationUpdate, TransferRequest, WarehouseType

router = APIRouter()


def serialize_warehouse(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]), "code": doc.get("code", ""), "name": doc.get("name", ""),
        "address": doc.get("address", ""), "type": doc.get("type", "main"),
        "manager_id": doc.get("manager_id", ""), "manager_name": doc.get("manager_name", ""),
        "phone": doc.get("phone", ""), "total_items": doc.get("total_items", 0),
        "created_at": doc["created_at"], "updated_at": doc["updated_at"],
    }


def serialize_location(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]), "warehouse_id": doc.get("warehouse_id", ""),
        "warehouse_name": doc.get("warehouse_name", ""), "location_code": doc.get("location_code", ""),
        "zone": doc.get("zone", "storage"), "capacity": doc.get("capacity", 50),
        "current_count": doc.get("current_count", 0), "description": doc.get("description", ""),
        "created_at": doc["created_at"], "updated_at": doc["updated_at"],
    }


async def generate_warehouse_code(db) -> str:
    last = await db.warehouses.find_one(sort=[("created_at", -1)])
    if last and "code" in last:
        try:
            num = int(last["code"].split("-")[1])
            return f"WH-{num + 1:03d}"
        except (IndexError, ValueError):
            pass
    return "WH-001"


@router.get("")
async def list_warehouses(current_user: dict = Depends(get_current_user)):
    db = get_db()
    cursor = db.warehouses.find().sort("created_at", -1)
    warehouses = []
    async for doc in cursor:
        count = await db.serial_units.count_documents({"warehouse_id": str(doc["_id"]), "status": "available"})
        doc["total_items"] = count
        warehouses.append(serialize_warehouse(doc))
    return {"warehouses": warehouses, "total": len(warehouses)}


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_warehouse(data: WarehouseCreate, current_user: dict = Depends(get_current_user)):
    db = get_db()
    code = await generate_warehouse_code(db)
    now = datetime.now(timezone.utc)
    manager_name = ""
    if data.manager_id:
        try:
            user = await db.users.find_one({"_id": ObjectId(data.manager_id)})
            if user:
                manager_name = user.get("full_name", "")
        except Exception:
            pass
    doc = {
        "code": code, "name": data.name, "address": data.address,
        "type": data.type.value, "manager_id": data.manager_id,
        "manager_name": manager_name, "phone": data.phone,
        "total_items": 0, "created_at": now, "updated_at": now,
    }
    result = await db.warehouses.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_warehouse(doc)


@router.put("/{warehouse_id}")
async def update_warehouse(warehouse_id: str, update: WarehouseUpdate, current_user: dict = Depends(get_current_user)):
    db = get_db()
    try:
        oid = ObjectId(warehouse_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid warehouse ID")
    existing = await db.warehouses.find_one({"_id": oid})
    if not existing:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if "type" in update_data and isinstance(update_data["type"], WarehouseType):
        update_data["type"] = update_data["type"].value
    update_data["updated_at"] = datetime.now(timezone.utc)
    await db.warehouses.update_one({"_id": oid}, {"$set": update_data})
    updated = await db.warehouses.find_one({"_id": oid})
    return serialize_warehouse(updated)


@router.delete("/{warehouse_id}")
async def delete_warehouse(warehouse_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    try:
        oid = ObjectId(warehouse_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid warehouse ID")
    count = await db.serial_units.count_documents({"warehouse_id": warehouse_id})
    if count > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete: {count} serial units still in this warehouse")
    result = await db.warehouses.delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    return {"message": "Warehouse deleted"}


@router.get("/{warehouse_id}/stock")
async def warehouse_stock(warehouse_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    pipeline = [
        {"$match": {"warehouse_id": warehouse_id}},
        {"$group": {"_id": {"inventory_id": "$inventory_id", "status": "$status", "condition": "$condition"}, "count": {"$sum": 1}}},
    ]
    cursor = await db.serial_units.aggregate(pipeline)
    stock = []
    async for doc in cursor:
        inv_id = doc["_id"]["inventory_id"]
        inv_name = ""
        try:
            inv = await db.inventory.find_one({"_id": ObjectId(inv_id)})
            if inv:
                inv_name = inv.get("name", "")
        except Exception:
            pass
        stock.append({
            "inventory_id": inv_id, "product_name": inv_name,
            "status": doc["_id"]["status"], "condition": doc["_id"]["condition"], "count": doc["count"],
        })
    return {"warehouse_id": warehouse_id, "stock": stock}


@router.post("/transfer")
async def transfer_stock(data: TransferRequest, current_user: dict = Depends(get_current_user)):
    db = get_db()
    now = datetime.now(timezone.utc)
    updated = 0
    for sid in data.serial_unit_ids:
        try:
            result = await db.serial_units.update_one(
                {"_id": ObjectId(sid)},
                {"$set": {"warehouse_id": data.to_warehouse_id, "location_code": data.to_location_code, "updated_at": now}},
            )
            if result.modified_count:
                updated += 1
        except Exception:
            pass
    # Log transfer
    await db.transfer_logs.insert_one({
        "serial_unit_ids": data.serial_unit_ids, "from_warehouse_id": data.from_warehouse_id,
        "to_warehouse_id": data.to_warehouse_id, "to_location_code": data.to_location_code,
        "reason": data.reason, "transferred_by": str(current_user["_id"]),
        "transferred_count": updated, "created_at": now,
    })
    return {"transferred": updated, "total_requested": len(data.serial_unit_ids)}


@router.get("/stock-by-branch")
async def stock_by_branch(current_user: dict = Depends(get_current_user)):
    db = get_db()
    pipeline = [
        {"$match": {"status": "available"}},
        {"$group": {"_id": "$warehouse_id", "count": {"$sum": 1}}},
    ]
    cursor = await db.serial_units.aggregate(pipeline)
    branches = []
    async for doc in cursor:
        wh_name = "Chưa phân kho"
        if doc["_id"]:
            try:
                wh = await db.warehouses.find_one({"_id": ObjectId(doc["_id"])})
                if wh:
                    wh_name = wh.get("name", doc["_id"])
            except Exception:
                wh_name = doc["_id"]
        branches.append({"warehouse_id": doc["_id"] or "", "warehouse_name": wh_name, "available_count": doc["count"]})
    return {"branches": branches}


# ── Warehouse Locations ──

@router.get("/{warehouse_id}/locations")
async def list_locations(warehouse_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    cursor = db.warehouse_locations.find({"warehouse_id": warehouse_id}).sort("location_code", 1)
    locations = []
    async for doc in cursor:
        count = await db.serial_units.count_documents({"warehouse_id": warehouse_id, "location_code": doc["location_code"]})
        doc["current_count"] = count
        locations.append(serialize_location(doc))
    return {"locations": locations}


@router.post("/locations", status_code=status.HTTP_201_CREATED)
async def create_location(data: WarehouseLocationCreate, current_user: dict = Depends(get_current_user)):
    db = get_db()
    now = datetime.now(timezone.utc)
    doc = {
        "warehouse_id": data.warehouse_id, "location_code": data.location_code,
        "zone": data.zone.value, "capacity": data.capacity,
        "description": data.description, "current_count": 0,
        "created_at": now, "updated_at": now,
    }
    result = await db.warehouse_locations.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_location(doc)

