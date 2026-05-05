# Copyright (C) 2026 gbao86 <tiktokthu10@gmail.com>
# This file is part of the chims project.
# Licensed under the GNU General Public License v3.0; see LICENSE for details.
from fastapi import APIRouter, Depends, HTTPException, Query, status
from bson import ObjectId
from datetime import datetime, timezone
from typing import Optional

from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.purchase_order import PurchaseOrderCreate, PurchaseOrderStatusUpdate, POStatus
from app.models.inventory import compute_stock_status

router = APIRouter()


def serialize_po(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "po_number": doc["po_number"],
        "supplier_id": doc.get("supplier_id", ""),
        "supplier_name": doc.get("supplier_name", ""),
        "items": doc.get("items", []),
        "total_amount": doc.get("total_amount", 0),
        "status": doc.get("status", "draft"),
        "received_by": doc.get("received_by"),
        "received_by_name": doc.get("received_by_name"),
        "notes": doc.get("notes", ""),
        "created_at": doc["created_at"],
        "updated_at": doc["updated_at"],
    }


async def generate_po_number(db) -> str:
    last = await db.purchase_orders.find_one(sort=[("created_at", -1)])
    if last and "po_number" in last:
        try:
            num = int(last["po_number"].split("-")[1])
            return f"PO-{num + 1:04d}"
        except (IndexError, ValueError):
            pass
    return "PO-0001"


@router.get("")
async def list_purchase_orders(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status_filter: Optional[POStatus] = Query(None, alias="status"),
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    query = {}
    if status_filter:
        query["status"] = status_filter.value
    skip = (page - 1) * limit
    total = await db.purchase_orders.count_documents(query)
    cursor = db.purchase_orders.find(query).skip(skip).limit(limit).sort("created_at", -1)
    orders = []
    async for doc in cursor:
        orders.append(serialize_po(doc))
    return {"orders": orders, "total": total, "page": page, "limit": limit}


def _resolve_po_items(db, items):
    async def _resolve():
        resolved = []
        total = 0
        for item in items:
            inv = None
            try:
                inv = await db.inventory.find_one({"_id": ObjectId(item.inventory_id)})
            except Exception:
                pass
            name = inv["name"] if inv else item.name
            resolved.append({
                "inventory_id": item.inventory_id,
                "name": name,
                "quantity": item.quantity,
                "unit_cost": item.unit_cost,
            })
            total += item.unit_cost * item.quantity
        return resolved, total
    return _resolve()


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_purchase_order(
    data: PurchaseOrderCreate, current_user: dict = Depends(get_current_user)
):
    db = get_db()
    now = datetime.now(timezone.utc)
    po_number = await generate_po_number(db)

    supplier_name = ""
    try:
        supplier = await db.suppliers.find_one({"_id": ObjectId(data.supplier_id)})
        if supplier:
            supplier_name = supplier["name"]
    except Exception:
        pass

    items_data, total = await _resolve_po_items(db, data.items)

    doc = {
        "po_number": po_number,
        "supplier_id": data.supplier_id,
        "supplier_name": supplier_name,
        "items": items_data,
        "total_amount": total,
        "status": POStatus.DRAFT.value,
        "received_by": None,
        "received_by_name": None,
        "notes": data.notes,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.purchase_orders.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_po(doc)


@router.put("/{po_id}")
async def update_purchase_order(
    po_id: str,
    data: PurchaseOrderCreate,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    try:
        oid = ObjectId(po_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID")
    po = await db.purchase_orders.find_one({"_id": oid})
    if not po:
        raise HTTPException(status_code=404, detail="PO not found")
    if po["status"] != POStatus.DRAFT.value:
        raise HTTPException(status_code=400, detail="Only draft POs can be edited")

    supplier_name = ""
    try:
        supplier = await db.suppliers.find_one({"_id": ObjectId(data.supplier_id)})
        if supplier:
            supplier_name = supplier["name"]
    except Exception:
        pass

    items_data, total = await _resolve_po_items(db, data.items)
    update_data = {
        "supplier_id": data.supplier_id,
        "supplier_name": supplier_name,
        "items": items_data,
        "total_amount": total,
        "notes": data.notes,
        "updated_at": datetime.now(timezone.utc),
    }
    await db.purchase_orders.update_one({"_id": oid}, {"$set": update_data})
    updated = await db.purchase_orders.find_one({"_id": oid})
    return serialize_po(updated)


@router.put("/{po_id}/status")
async def update_po_status(
    po_id: str,
    data: PurchaseOrderStatusUpdate,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    try:
        oid = ObjectId(po_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID")

    po = await db.purchase_orders.find_one({"_id": oid})
    if not po:
        raise HTTPException(status_code=404, detail="PO not found")

    old_status = po["status"]
    new_status = data.status.value

    update_fields = {"status": new_status, "updated_at": datetime.now(timezone.utc)}

    # When received: add stock to inventory
    if new_status == "received" and old_status != "received":
        update_fields["received_by"] = str(current_user["_id"])
        update_fields["received_by_name"] = current_user.get("full_name", "")

        for item in po.get("items", []):
            try:
                inv_oid = ObjectId(item["inventory_id"])
            except Exception:
                continue
            inv = await db.inventory.find_one({"_id": inv_oid})
            if inv:
                new_qty = inv["stock_quantity"] + item["quantity"]
                await db.inventory.update_one(
                    {"_id": inv_oid},
                    {"$set": {
                        "stock_quantity": new_qty,
                        "status": compute_stock_status(new_qty, inv.get("min_stock", 5)).value,
                        "updated_at": datetime.now(timezone.utc),
                    }}
                )
        # Update supplier order count
        try:
            await db.suppliers.update_one(
                {"_id": ObjectId(po["supplier_id"])},
                {"$inc": {"total_orders": 1}}
            )
        except Exception:
            pass

    await db.purchase_orders.update_one({"_id": oid}, {"$set": update_fields})
    updated = await db.purchase_orders.find_one({"_id": oid})
    return serialize_po(updated)


@router.delete("/{po_id}")
async def delete_purchase_order(
    po_id: str, current_user: dict = Depends(get_current_user)
):
    db = get_db()
    try:
        oid = ObjectId(po_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID")
    po = await db.purchase_orders.find_one({"_id": oid})
    if not po:
        raise HTTPException(status_code=404, detail="PO not found")
    if po["status"] not in ["draft"]:
        raise HTTPException(status_code=400, detail="Only draft POs can be deleted")
    await db.purchase_orders.delete_one({"_id": oid})
    return {"message": "PO deleted"}

