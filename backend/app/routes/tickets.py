# Copyright (C) 2026 gbao86 <tiktokthu10@gmail.com>
# This file is part of the chims project.
# Licensed under the GNU General Public License v3.0; see LICENSE for details.
from fastapi import APIRouter, Depends, HTTPException, Query, status
from bson import ObjectId
from datetime import datetime, timezone
from typing import Optional

from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.ticket import (
    TicketCreate,
    TicketStatusUpdate,
    AddPartsRequest,
    TicketStatus,
)
from app.models.inventory import compute_stock_status

router = APIRouter()


def serialize_ticket(ticket: dict) -> dict:
    """Convert MongoDB document to response format."""
    return {
        "id": str(ticket["_id"]),
        "ticket_id": ticket["ticket_id"],
        "customer_info": ticket["customer_info"],
        "device_info": ticket["device_info"],
        "issue_description": ticket["issue_description"],
        "status": ticket["status"],
        "technician_id": ticket.get("technician_id"),
        "technician_name": ticket.get("technician_name"),
        "parts_used": ticket.get("parts_used", []),
        "total_cost": ticket.get("total_cost", 0),
        "created_at": ticket["created_at"],
        "updated_at": ticket["updated_at"],
    }


async def generate_ticket_id(db) -> str:
    """Generate next sequential ticket ID like TKT-1001."""
    last_ticket = await db.tickets.find_one(sort=[("created_at", -1)])
    if last_ticket and "ticket_id" in last_ticket:
        try:
            last_num = int(last_ticket["ticket_id"].split("-")[1])
            return f"TKT-{last_num + 1}"
        except (IndexError, ValueError):
            pass
    return "TKT-1001"


@router.get("")
async def list_tickets(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    status_filter: Optional[TicketStatus] = Query(None, alias="status"),
    current_user: dict = Depends(get_current_user),
):
    """List maintenance tickets with optional status filter."""
    db = get_db()
    query = {}

    if status_filter:
        query["status"] = status_filter.value

    skip = (page - 1) * limit
    total = await db.tickets.count_documents(query)

    cursor = db.tickets.find(query).skip(skip).limit(limit).sort("created_at", -1)
    tickets = []
    async for ticket in cursor:
        tickets.append(serialize_ticket(ticket))

    return {
        "tickets": tickets,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit,
    }


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_ticket(
    ticket: TicketCreate,
    current_user: dict = Depends(get_current_user),
):
    """Create a new maintenance ticket."""
    db = get_db()
    now = datetime.now(timezone.utc)

    ticket_id = await generate_ticket_id(db)

    # Look up technician name if provided
    technician_name = None
    if ticket.technician_id:
        try:
            tech = await db.users.find_one({"_id": ObjectId(ticket.technician_id)})
            if tech:
                technician_name = tech["full_name"]
        except Exception:
            pass

    doc = {
        "ticket_id": ticket_id,
        "customer_info": ticket.customer_info.model_dump(),
        "device_info": ticket.device_info,
        "issue_description": ticket.issue_description,
        "status": TicketStatus.PENDING.value,
        "technician_id": ticket.technician_id,
        "technician_name": technician_name,
        "parts_used": [],
        "total_cost": 0.0,
        "created_at": now,
        "updated_at": now,
    }

    result = await db.tickets.insert_one(doc)
    doc["_id"] = result.inserted_id

    return serialize_ticket(doc)


@router.put("/{ticket_id}/status")
async def update_ticket_status(
    ticket_id: str,
    update: TicketStatusUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Update a ticket's status."""
    db = get_db()

    try:
        oid = ObjectId(ticket_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid ticket ID"
        )

    result = await db.tickets.update_one(
        {"_id": oid},
        {
            "$set": {
                "status": update.status.value,
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found"
        )

    updated = await db.tickets.find_one({"_id": oid})
    return serialize_ticket(updated)


@router.put("/{ticket_id}/parts")
async def add_parts_to_ticket(
    ticket_id: str,
    request: AddPartsRequest,
    current_user: dict = Depends(get_current_user),
):
    """Add parts to a ticket and auto-deduct from inventory stock."""
    db = get_db()

    try:
        oid = ObjectId(ticket_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid ticket ID"
        )

    ticket = await db.tickets.find_one({"_id": oid})
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found"
        )

    parts_to_add = []

    for part in request.parts:
        try:
            inv_oid = ObjectId(part.inventory_id)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid inventory ID: {part.inventory_id}",
            )

        inv_item = await db.inventory.find_one({"_id": inv_oid})
        if not inv_item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Inventory item not found: {part.inventory_id}",
            )

        if inv_item["stock_quantity"] < part.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient stock for {inv_item['name']}. Available: {inv_item['stock_quantity']}, Requested: {part.quantity}",
            )

        # Deduct stock
        new_qty = inv_item["stock_quantity"] - part.quantity
        await db.inventory.update_one(
            {"_id": inv_oid},
            {
                "$set": {
                    "stock_quantity": new_qty,
                    "status": compute_stock_status(new_qty).value,
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )

        parts_to_add.append(
            {
                "inventory_id": part.inventory_id,
                "name": inv_item["name"],
                "quantity": part.quantity,
                "price": part.price if part.price > 0 else inv_item["unit_price"],
            }
        )

    # Update ticket with new parts
    existing_parts = ticket.get("parts_used", [])
    all_parts = existing_parts + parts_to_add
    total_cost = sum(p["price"] * p["quantity"] for p in all_parts)

    await db.tickets.update_one(
        {"_id": oid},
        {
            "$set": {
                "parts_used": all_parts,
                "total_cost": total_cost,
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )

    updated = await db.tickets.find_one({"_id": oid})
    return serialize_ticket(updated)

