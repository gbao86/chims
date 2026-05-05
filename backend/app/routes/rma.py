from fastapi import APIRouter, Depends, HTTPException, Query, status
from bson import ObjectId
from datetime import datetime, timezone
from typing import Optional

from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.rma import RMACreate, RMAStatusUpdate, RMAStatus

router = APIRouter()


def serialize_rma(doc: dict) -> dict:
    timeline = []
    for evt in doc.get("timeline", []):
        timeline.append({
            "timestamp": evt.get("timestamp"), "status": evt.get("status", ""),
            "note": evt.get("note", ""), "performed_by": evt.get("performed_by", ""),
        })
    return {
        "id": str(doc["_id"]), "rma_code": doc.get("rma_code", ""),
        "warranty_id": doc.get("warranty_id", ""), "warranty_code": doc.get("warranty_code", ""),
        "serial_number": doc.get("serial_number", ""),
        "customer_id": doc.get("customer_id", ""), "customer_name": doc.get("customer_name", ""),
        "customer_phone": doc.get("customer_phone", ""), "product_name": doc.get("product_name", ""),
        "issue_description": doc.get("issue_description", ""), "status": doc.get("status", "received"),
        "timeline": timeline, "vendor_name": doc.get("vendor_name", ""),
        "vendor_tracking": doc.get("vendor_tracking", ""),
        "replacement_serial": doc.get("replacement_serial", ""),
        "estimated_return_date": doc.get("estimated_return_date"),
        "created_at": doc["created_at"], "updated_at": doc["updated_at"],
    }


async def generate_rma_code(db) -> str:
    last = await db.rma_tickets.find_one(sort=[("created_at", -1)])
    if last and "rma_code" in last:
        try:
            num = int(last["rma_code"].split("-")[1])
            return f"RMA-{num + 1:04d}"
        except (IndexError, ValueError):
            pass
    return "RMA-0001"


@router.get("")
async def list_rma(
    page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100),
    status_filter: Optional[RMAStatus] = Query(None, alias="status"),
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    query = {}
    if status_filter:
        query["status"] = status_filter.value
    if search:
        query["$or"] = [
            {"rma_code": {"$regex": search, "$options": "i"}},
            {"serial_number": {"$regex": search, "$options": "i"}},
            {"customer_name": {"$regex": search, "$options": "i"}},
            {"customer_phone": {"$regex": search, "$options": "i"}},
        ]
    skip = (page - 1) * limit
    total = await db.rma_tickets.count_documents(query)
    cursor = db.rma_tickets.find(query).skip(skip).limit(limit).sort("created_at", -1)
    items = []
    async for doc in cursor:
        items.append(serialize_rma(doc))
    return {"items": items, "total": total, "page": page, "limit": limit}


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_rma(data: RMACreate, current_user: dict = Depends(get_current_user)):
    db = get_db()
    code = await generate_rma_code(db)
    now = datetime.now(timezone.utc)

    # Look up warranty info
    warranty_code = ""
    product_name = data.product_name
    customer_name = data.customer_name
    customer_phone = data.customer_phone

    if data.warranty_id:
        try:
            warranty = await db.warranties.find_one({"_id": ObjectId(data.warranty_id)})
            if warranty:
                warranty_code = warranty.get("warranty_code", "")
                if not product_name:
                    product_name = warranty.get("product_name", "")
                if not customer_name:
                    customer_name = warranty.get("customer_name", "")
        except Exception:
            pass

    # Look up customer phone if customer_id given
    if data.customer_id and not customer_phone:
        try:
            cust = await db.customers.find_one({"_id": ObjectId(data.customer_id)})
            if cust:
                customer_phone = cust.get("phone", "")
                if not customer_name:
                    customer_name = cust.get("name", "")
        except Exception:
            pass

    # Look up product from serial
    if data.serial_number and not product_name:
        serial_doc = await db.serial_units.find_one({"serial_number": data.serial_number})
        if serial_doc:
            try:
                inv = await db.inventory.find_one({"_id": ObjectId(serial_doc["inventory_id"])})
                if inv:
                    product_name = inv.get("name", "")
            except Exception:
                pass

    # Mark serial unit as RMA
    if data.serial_number:
        await db.serial_units.update_many(
            {"serial_number": data.serial_number},
            {"$set": {"status": "rma", "condition": "rma", "updated_at": now}},
        )

    initial_event = {"timestamp": now, "status": RMAStatus.RECEIVED.value, "note": "Tiếp nhận từ khách hàng", "performed_by": current_user.get("full_name", "")}
    doc = {
        "rma_code": code, "warranty_id": data.warranty_id, "warranty_code": warranty_code,
        "serial_number": data.serial_number, "customer_id": data.customer_id,
        "customer_name": customer_name, "customer_phone": customer_phone,
        "product_name": product_name, "issue_description": data.issue_description,
        "status": RMAStatus.RECEIVED.value, "timeline": [initial_event],
        "vendor_name": data.vendor_name, "vendor_tracking": "", "replacement_serial": "",
        "estimated_return_date": None, "created_at": now, "updated_at": now,
    }
    result = await db.rma_tickets.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_rma(doc)


@router.put("/{rma_id}/status")
async def update_rma_status(rma_id: str, data: RMAStatusUpdate, current_user: dict = Depends(get_current_user)):
    db = get_db()
    try:
        oid = ObjectId(rma_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid RMA ID")
    rma = await db.rma_tickets.find_one({"_id": oid})
    if not rma:
        raise HTTPException(status_code=404, detail="RMA ticket not found")
    now = datetime.now(timezone.utc)
    event = {"timestamp": now, "status": data.status.value, "note": data.note, "performed_by": current_user.get("full_name", "")}
    update_fields = {"status": data.status.value, "updated_at": now}
    if data.vendor_tracking:
        update_fields["vendor_tracking"] = data.vendor_tracking
    if data.replacement_serial:
        update_fields["replacement_serial"] = data.replacement_serial
    if data.estimated_return_date:
        update_fields["estimated_return_date"] = data.estimated_return_date

    # If returned to customer or replaced, restore serial unit
    if data.status in [RMAStatus.RETURNED_TO_CUSTOMER, RMAStatus.REPLACED]:
        serial = rma.get("serial_number")
        if serial:
            new_status = "available" if data.status == RMAStatus.RETURNED_TO_CUSTOMER else "sold"
            await db.serial_units.update_many(
                {"serial_number": serial}, {"$set": {"status": new_status, "condition": "rma", "updated_at": now}},
            )

    await db.rma_tickets.update_one({"_id": oid}, {"$push": {"timeline": event}, "$set": update_fields})
    updated = await db.rma_tickets.find_one({"_id": oid})
    return serialize_rma(updated)


@router.get("/lookup")
async def lookup_rma(
    q: str = Query(..., description="Serial number or phone number"),
    current_user: dict = Depends(get_current_user),
):
    """Look up warranty and RMA history by serial number or phone."""
    db = get_db()
    results = {"warranties": [], "rma_tickets": [], "purchase_history": []}

    # Search warranties
    w_cursor = db.warranties.find({"$or": [
        {"serial_number": {"$regex": q, "$options": "i"}},
        {"customer_name": {"$regex": q, "$options": "i"}},
    ]}).limit(10)
    async for doc in w_cursor:
        results["warranties"].append({
            "id": str(doc["_id"]), "warranty_code": doc.get("warranty_code", ""),
            "product_name": doc.get("product_name", ""), "serial_number": doc.get("serial_number", ""),
            "status": doc.get("status", ""), "expiry_date": doc.get("expiry_date"),
            "customer_name": doc.get("customer_name", ""),
        })

    # Search by phone in customers
    cust_cursor = db.customers.find({"phone": {"$regex": q, "$options": "i"}}).limit(5)
    customer_ids = []
    async for cust in cust_cursor:
        customer_ids.append(str(cust["_id"]))
        # Get warranties by customer
        cw = db.warranties.find({"customer_id": str(cust["_id"])}).limit(10)
        async for w in cw:
            already = any(wr["id"] == str(w["_id"]) for wr in results["warranties"])
            if not already:
                results["warranties"].append({
                    "id": str(w["_id"]), "warranty_code": w.get("warranty_code", ""),
                    "product_name": w.get("product_name", ""), "serial_number": w.get("serial_number", ""),
                    "status": w.get("status", ""), "expiry_date": w.get("expiry_date"),
                    "customer_name": w.get("customer_name", ""),
                })

    # Search RMA tickets
    rma_cursor = db.rma_tickets.find({"$or": [
        {"serial_number": {"$regex": q, "$options": "i"}},
        {"customer_phone": {"$regex": q, "$options": "i"}},
        {"rma_code": {"$regex": q, "$options": "i"}},
    ]}).limit(10)
    async for doc in rma_cursor:
        results["rma_tickets"].append(serialize_rma(doc))

    return results


@router.get("/{rma_id}")
async def get_rma(rma_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    try:
        oid = ObjectId(rma_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid RMA ID")
    doc = await db.rma_tickets.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="RMA ticket not found")
    return serialize_rma(doc)
