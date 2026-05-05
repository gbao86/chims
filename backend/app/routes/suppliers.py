# Copyright (C) 2026 gbao86 <tiktokthu10@gmail.com>
# This file is part of the chims project.
# Licensed under the GNU General Public License v3.0; see LICENSE for details.
from fastapi import APIRouter, Depends, HTTPException, Query, status
from bson import ObjectId
from datetime import datetime, timezone
from typing import Optional

from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.supplier import SupplierCreate, SupplierUpdate, SupplierStatus

router = APIRouter()


def serialize_supplier(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "code": doc.get("code", ""),
        "name": doc["name"],
        "contact": doc.get("contact", {}),
        "address": doc.get("address", ""),
        "notes": doc.get("notes", ""),
        "rating": doc.get("rating", 0),
        "total_orders": doc.get("total_orders", 0),
        "status": doc.get("status", "active"),
        "created_at": doc["created_at"],
        "updated_at": doc["updated_at"],
    }


async def generate_supplier_code(db) -> str:
    last = await db.suppliers.find_one(sort=[("created_at", -1)])
    if last and "code" in last:
        try:
            num = int(last["code"].split("-")[1])
            return f"NCC-{num + 1:04d}"
        except (IndexError, ValueError):
            pass
    return "NCC-0001"


@router.get("")
async def list_suppliers(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    query = {}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"code": {"$regex": search, "$options": "i"}},
        ]
    skip = (page - 1) * limit
    total = await db.suppliers.count_documents(query)
    cursor = db.suppliers.find(query).skip(skip).limit(limit).sort("created_at", -1)
    suppliers = []
    async for doc in cursor:
        suppliers.append(serialize_supplier(doc))
    return {"suppliers": suppliers, "total": total, "page": page, "limit": limit}


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_supplier(
    data: SupplierCreate, current_user: dict = Depends(get_current_user)
):
    db = get_db()
    now = datetime.now(timezone.utc)
    code = await generate_supplier_code(db)
    doc = {
        "code": code,
        "name": data.name,
        "contact": data.contact.model_dump(),
        "address": data.address,
        "notes": data.notes,
        "rating": 0,
        "total_orders": 0,
        "status": SupplierStatus.ACTIVE.value,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.suppliers.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_supplier(doc)


@router.put("/{supplier_id}")
async def update_supplier(
    supplier_id: str,
    data: SupplierUpdate,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    try:
        oid = ObjectId(supplier_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID")
    update_data = {}
    for k, v in data.model_dump().items():
        if v is not None:
            if k == "contact":
                update_data[k] = v
            else:
                update_data[k] = v
    update_data["updated_at"] = datetime.now(timezone.utc)
    result = await db.suppliers.update_one({"_id": oid}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Supplier not found")
    updated = await db.suppliers.find_one({"_id": oid})
    return serialize_supplier(updated)


@router.delete("/{supplier_id}")
async def delete_supplier(
    supplier_id: str, current_user: dict = Depends(get_current_user)
):
    db = get_db()
    try:
        oid = ObjectId(supplier_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID")
    result = await db.suppliers.delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return {"message": "Supplier deleted"}

