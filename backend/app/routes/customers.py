from fastapi import APIRouter, Depends, HTTPException, Query, status
from bson import ObjectId
from datetime import datetime, timezone
from typing import Optional

from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.customer import CustomerCreate, CustomerUpdate, CustomerType

router = APIRouter()


def serialize_customer(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "code": doc.get("code", ""),
        "name": doc["name"],
        "phone": doc.get("phone", ""),
        "email": doc.get("email", ""),
        "address": doc.get("address", ""),
        "type": doc.get("type", "individual"),
        "total_spent": doc.get("total_spent", 0),
        "order_count": doc.get("order_count", 0),
        "created_at": doc["created_at"],
        "updated_at": doc["updated_at"],
    }


async def generate_customer_code(db) -> str:
    last = await db.customers.find_one(sort=[("created_at", -1)])
    if last and "code" in last:
        try:
            num = int(last["code"].split("-")[1])
            return f"KH-{num + 1:04d}"
        except (IndexError, ValueError):
            pass
    return "KH-0001"


@router.get("")
async def list_customers(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    customer_type: Optional[CustomerType] = Query(None, alias="type"),
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    query = {}
    if customer_type:
        query["type"] = customer_type.value
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"code": {"$regex": search, "$options": "i"}},
        ]
    skip = (page - 1) * limit
    total = await db.customers.count_documents(query)
    cursor = db.customers.find(query).skip(skip).limit(limit).sort("created_at", -1)
    customers = []
    async for doc in cursor:
        customers.append(serialize_customer(doc))
    return {"customers": customers, "total": total, "page": page, "limit": limit}


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_customer(
    data: CustomerCreate, current_user: dict = Depends(get_current_user)
):
    db = get_db()
    now = datetime.now(timezone.utc)
    code = await generate_customer_code(db)
    doc = {
        **data.model_dump(),
        "code": code,
        "total_spent": 0,
        "order_count": 0,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.customers.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_customer(doc)


@router.put("/{customer_id}")
async def update_customer(
    customer_id: str,
    data: CustomerUpdate,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    try:
        oid = ObjectId(customer_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID")
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    result = await db.customers.update_one({"_id": oid}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    updated = await db.customers.find_one({"_id": oid})
    return serialize_customer(updated)


@router.delete("/{customer_id}")
async def delete_customer(
    customer_id: str, current_user: dict = Depends(get_current_user)
):
    db = get_db()
    try:
        oid = ObjectId(customer_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID")
    result = await db.customers.delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    return {"message": "Customer deleted"}
