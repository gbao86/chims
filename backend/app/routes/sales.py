# Copyright (C) 2026 gbao86 <tiktokthu10@gmail.com>
# This file is part of the chims project.
# Licensed under the GNU General Public License v3.0; see LICENSE for details.
from fastapi import APIRouter, Depends, HTTPException, Query, status
from bson import ObjectId
from datetime import datetime, timezone
from typing import Optional

from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.sales_order import SalesOrderCreate, SalesStatusUpdate, SalesStatus
from app.models.inventory import compute_stock_status

router = APIRouter()


def serialize_sales_order(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "invoice_number": doc["invoice_number"],
        "customer_id": doc.get("customer_id"),
        "customer_name": doc.get("customer_name", ""),
        "customer_phone": doc.get("customer_phone", ""),
        "items": doc.get("items", []),
        "subtotal": doc.get("subtotal", 0),
        "item_discounts_total": doc.get("item_discounts_total", 0),
        "discount_total": doc.get("discount_total", 0),
        "total_amount": doc.get("total_amount", 0),
        "payment_method": doc.get("payment_method", "cash"),
        "status": doc.get("status", "draft"),
        "sold_by": doc.get("sold_by"),
        "sold_by_name": doc.get("sold_by_name"),
        "notes": doc.get("notes", ""),
        "created_at": doc["created_at"],
        "updated_at": doc["updated_at"],
    }


async def generate_invoice_number(db) -> str:
    last = await db.sales_orders.find_one(sort=[("created_at", -1)])
    if last and "invoice_number" in last:
        try:
            num = int(last["invoice_number"].split("-")[1])
            return f"INV-{num + 1:04d}"
        except (IndexError, ValueError):
            pass
    return "INV-0001"


@router.get("")
async def list_sales_orders(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    status_filter: Optional[SalesStatus] = Query(None, alias="status"),
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    query = {}
    if status_filter:
        query["status"] = status_filter.value
    if search:
        query["$or"] = [
            {"invoice_number": {"$regex": search, "$options": "i"}},
            {"customer_name": {"$regex": search, "$options": "i"}},
            {"customer_phone": {"$regex": search, "$options": "i"}},
        ]
    skip = (page - 1) * limit
    total = await db.sales_orders.count_documents(query)
    cursor = db.sales_orders.find(query).skip(skip).limit(limit).sort("created_at", -1)
    orders = []
    async for doc in cursor:
        orders.append(serialize_sales_order(doc))
    return {"orders": orders, "total": total, "page": page, "limit": limit}


def _build_sales_items(db, items):
    async def _resolve():
        resolved = []
        for item in items:
            try:
                inv_oid = ObjectId(item.inventory_id)
            except Exception:
                raise HTTPException(status_code=400, detail=f"Invalid inventory ID: {item.inventory_id}")
            inv = await db.inventory.find_one({"_id": inv_oid})
            if not inv:
                raise HTTPException(status_code=404, detail=f"Product not found: {item.inventory_id}")
            resolved.append({
                "inventory_id": item.inventory_id,
                "name": inv["name"],
                "quantity": item.quantity,
                "unit_price": item.unit_price if item.unit_price > 0 else inv["unit_price"],
                "discount": item.discount,
            })
        return resolved
    return _resolve()


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_sales_order(
    data: SalesOrderCreate, current_user: dict = Depends(get_current_user)
):
    db = get_db()
    now = datetime.now(timezone.utc)
    invoice = await generate_invoice_number(db)

    items_data = await _build_sales_items(db, data.items)
    subtotal = sum(i["unit_price"] * i["quantity"] for i in items_data)
    # item_discounts = sum of (discount_per_unit × quantity) for each line
    item_discounts = sum(i["discount"] * i["quantity"] for i in items_data)
    total_amount = subtotal - item_discounts - data.discount_total

    # Auto-upsert customer into customers collection (phone as unique key)
    customer_id = data.customer_id
    if data.customer_name and data.customer_phone and not customer_id:
        existing = await db.customers.find_one({"phone": data.customer_phone})
        if existing:
            customer_id = str(existing["_id"])
        else:
            last = await db.customers.find_one(sort=[("created_at", -1)])
            try:
                num = int(last["code"].split("-")[1]) + 1 if last and "code" in last else 1
            except (IndexError, ValueError, TypeError):
                num = 1
            new_cust = {
                "code": f"KH-{num:04d}",
                "name": data.customer_name,
                "phone": data.customer_phone,
                "email": "",
                "address": "",
                "type": "individual",
                "total_spent": 0,
                "order_count": 0,
                "created_at": now,
                "updated_at": now,
            }
            res_cust = await db.customers.insert_one(new_cust)
            customer_id = str(res_cust.inserted_id)

    doc = {
        "invoice_number": invoice,
        "customer_id": customer_id,
        "customer_name": data.customer_name,
        "customer_phone": data.customer_phone,
        "items": items_data,
        "subtotal": subtotal,
        "item_discounts_total": item_discounts,
        "discount_total": data.discount_total,
        "total_amount": max(total_amount, 0),
        "payment_method": data.payment_method.value,
        "status": SalesStatus.DRAFT.value,
        "sold_by": str(current_user["_id"]),
        "sold_by_name": current_user.get("full_name", ""),
        "notes": data.notes,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.sales_orders.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_sales_order(doc)


@router.put("/{order_id}")
async def update_sales_order(
    order_id: str,
    data: SalesOrderCreate,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    try:
        oid = ObjectId(order_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID")
    order = await db.sales_orders.find_one({"_id": oid})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order["status"] != SalesStatus.DRAFT.value:
        raise HTTPException(status_code=400, detail="Only draft orders can be edited")

    items_data = await _build_sales_items(db, data.items)
    subtotal = sum(i["unit_price"] * i["quantity"] for i in items_data)
    item_discounts = sum(i["discount"] * i["quantity"] for i in items_data)
    total_amount = subtotal - item_discounts - data.discount_total
    now = datetime.now(timezone.utc)

    # Auto-upsert customer if phone provided and no customer_id
    customer_id = data.customer_id
    if data.customer_name and data.customer_phone and not customer_id:
        existing = await db.customers.find_one({"phone": data.customer_phone})
        if existing:
            customer_id = str(existing["_id"])
            # Update name in case it changed
            await db.customers.update_one(
                {"_id": existing["_id"]},
                {"$set": {"name": data.customer_name, "updated_at": now}}
            )

    update_data = {
        "customer_id": customer_id,
        "customer_name": data.customer_name,
        "customer_phone": data.customer_phone,
        "items": items_data,
        "subtotal": subtotal,
        "item_discounts_total": item_discounts,
        "discount_total": data.discount_total,
        "total_amount": max(total_amount, 0),
        "payment_method": data.payment_method.value,
        "notes": data.notes,
        "updated_at": now,
    }
    await db.sales_orders.update_one({"_id": oid}, {"$set": update_data})
    updated = await db.sales_orders.find_one({"_id": oid})
    return serialize_sales_order(updated)


@router.put("/{order_id}/status")
async def update_sales_status(
    order_id: str,
    data: SalesStatusUpdate,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    try:
        oid = ObjectId(order_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID")

    order = await db.sales_orders.find_one({"_id": oid})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    old_status = order["status"]
    new_status = data.status.value

    # When confirming: deduct stock
    if old_status == "draft" and new_status == "confirmed":
        for item in order.get("items", []):
            try:
                inv_oid = ObjectId(item["inventory_id"])
            except Exception:
                continue
            inv = await db.inventory.find_one({"_id": inv_oid})
            if not inv:
                raise HTTPException(status_code=400, detail=f"Product not found: {item.get('name')}")
            if inv["stock_quantity"] < item["quantity"]:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient stock for {inv['name']}. Available: {inv['stock_quantity']}"
                )
            new_qty = inv["stock_quantity"] - item["quantity"]
            await db.inventory.update_one(
                {"_id": inv_oid},
                {"$set": {
                    "stock_quantity": new_qty,
                    "status": compute_stock_status(new_qty, inv.get("min_stock", 5)).value,
                    "updated_at": datetime.now(timezone.utc),
                }}
            )
        # Update customer stats
        if order.get("customer_id"):
            try:
                cust_oid = ObjectId(order["customer_id"])
                await db.customers.update_one(
                    {"_id": cust_oid},
                    {"$inc": {"total_spent": order["total_amount"], "order_count": 1}}
                )
            except Exception:
                pass

    # When cancelling confirmed order: restore stock
    if old_status == "confirmed" and new_status == "cancelled":
        for item in order.get("items", []):
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

    await db.sales_orders.update_one(
        {"_id": oid},
        {"$set": {"status": new_status, "updated_at": datetime.now(timezone.utc)}}
    )
    updated = await db.sales_orders.find_one({"_id": oid})
    return serialize_sales_order(updated)


@router.delete("/{order_id}")
async def delete_sales_order(
    order_id: str, current_user: dict = Depends(get_current_user)
):
    db = get_db()
    try:
        oid = ObjectId(order_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID")
    order = await db.sales_orders.find_one({"_id": oid})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order["status"] != "draft":
        raise HTTPException(status_code=400, detail="Only draft orders can be deleted")
    await db.sales_orders.delete_one({"_id": oid})
    return {"message": "Order deleted"}

