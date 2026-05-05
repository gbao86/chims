# Copyright (C) 2026 gbao86 <tiktokthu10@gmail.com>
# This file is part of the chims project.
# Licensed under the GNU General Public License v3.0; see LICENSE for details.
from fastapi import APIRouter, Depends, HTTPException, Query, status
from bson import ObjectId
from datetime import datetime, timezone, timedelta
from typing import Optional

from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.warranty import WarrantyCreate, WarrantyClaimRequest, WarrantyStatus

router = APIRouter()


def serialize_warranty(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "warranty_code": doc.get("warranty_code", ""),
        "sales_order_id": doc.get("sales_order_id", ""),
        "customer_id": doc.get("customer_id", ""),
        "customer_name": doc.get("customer_name", ""),
        "inventory_id": doc.get("inventory_id", ""),
        "serial_number": doc.get("serial_number", ""),
        "product_name": doc.get("product_name", ""),
        "purchase_date": doc.get("purchase_date"),
        "warranty_months": doc.get("warranty_months", 24),
        "expiry_date": doc.get("expiry_date"),
        "status": doc.get("status", "active"),
        "claims": doc.get("claims", []),
        "created_at": doc["created_at"],
        "updated_at": doc["updated_at"],
    }


async def generate_warranty_code(db) -> str:
    last = await db.warranties.find_one(sort=[("created_at", -1)])
    if last and "warranty_code" in last:
        try:
            num = int(last["warranty_code"].split("-")[1])
            return f"BH-{num + 1:04d}"
        except (IndexError, ValueError):
            pass
    return "BH-0001"


@router.get("")
async def list_warranties(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    status_filter: Optional[WarrantyStatus] = Query(None, alias="status"),
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    query = {}
    if status_filter:
        query["status"] = status_filter.value
    if search:
        query["$or"] = [
            {"warranty_code": {"$regex": search, "$options": "i"}},
            {"serial_number": {"$regex": search, "$options": "i"}},
            {"product_name": {"$regex": search, "$options": "i"}},
            {"customer_name": {"$regex": search, "$options": "i"}},
        ]
    skip = (page - 1) * limit
    total = await db.warranties.count_documents(query)
    cursor = db.warranties.find(query).skip(skip).limit(limit).sort("created_at", -1)
    warranties = []
    async for doc in cursor:
        warranties.append(serialize_warranty(doc))
    return {"warranties": warranties, "total": total, "page": page, "limit": limit}


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_warranty(
    data: WarrantyCreate, current_user: dict = Depends(get_current_user)
):
    db = get_db()
    now = datetime.now(timezone.utc)
    code = await generate_warranty_code(db)

    # Look up customer name
    customer_name = ""
    try:
        cust = await db.customers.find_one({"_id": ObjectId(data.customer_id)})
        if cust:
            customer_name = cust["name"]
    except Exception:
        pass

    expiry = now + timedelta(days=data.warranty_months * 30)

    doc = {
        "warranty_code": code,
        "sales_order_id": data.sales_order_id,
        "customer_id": data.customer_id,
        "customer_name": customer_name,
        "inventory_id": data.inventory_id,
        "serial_number": data.serial_number,
        "product_name": data.product_name,
        "purchase_date": now,
        "warranty_months": data.warranty_months,
        "expiry_date": expiry,
        "status": WarrantyStatus.ACTIVE.value,
        "claims": [],
        "created_at": now,
        "updated_at": now,
    }
    result = await db.warranties.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_warranty(doc)


@router.post("/claim")
async def create_warranty_claim(
    data: WarrantyClaimRequest, current_user: dict = Depends(get_current_user)
):
    db = get_db()
    try:
        oid = ObjectId(data.warranty_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid warranty ID")

    warranty = await db.warranties.find_one({"_id": oid})
    if not warranty:
        raise HTTPException(status_code=404, detail="Warranty not found")
    if warranty["status"] == "expired":
        raise HTTPException(status_code=400, detail="Warranty has expired")
    if warranty["status"] == "void":
        raise HTTPException(status_code=400, detail="Warranty is void")

    now = datetime.now(timezone.utc)
    claim = {
        "date": now,
        "issue": data.issue,
        "resolution": "",
        "cost": 0,
    }

    await db.warranties.update_one(
        {"_id": oid},
        {
            "$push": {"claims": claim},
            "$set": {"status": WarrantyStatus.CLAIMED.value, "updated_at": now},
        }
    )
    updated = await db.warranties.find_one({"_id": oid})
    return serialize_warranty(updated)

