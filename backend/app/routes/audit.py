# Copyright (C) 2026 gbao86 <tiktokthu10@gmail.com>
# This file is part of the chims project.
# Licensed under the GNU General Public License v3.0; see LICENSE for details.
from fastapi import APIRouter, Depends, HTTPException, Query, status
from bson import ObjectId
from datetime import datetime, timezone
from typing import Optional, List

from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.audit import AuditSessionCreate, AuditScanRequest, AuditStatus, AuditSessionUpdate

router = APIRouter()


def serialize_audit_session(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "audit_code": doc.get("audit_code", ""),
        "warehouse_id": doc.get("warehouse_id", ""),
        "started_by": doc.get("started_by", ""),
        "status": doc.get("status", "in_progress"),
        "expected_items": doc.get("expected_items", 0),
        "scanned_items": doc.get("scanned_items", 0),
        "discrepancies": doc.get("discrepancies", []),
        "notes": doc.get("notes", ""),
        "created_at": doc.get("created_at"),
        "updated_at": doc.get("updated_at"),
    }


async def generate_audit_code(db) -> str:
    last = await db.audit_sessions.find_one(sort=[("created_at", -1)])
    if last and "audit_code" in last:
        try:
            num = int(last["audit_code"].split("-")[1])
            return f"AUDIT-{num + 1:04d}"
        except (IndexError, ValueError):
            pass
    return "AUDIT-0001"


@router.post("/start", status_code=status.HTTP_201_CREATED)
async def start_audit_session(data: AuditSessionCreate, current_user: dict = Depends(get_current_user)):
    db = get_db()
    now = datetime.now(timezone.utc)
    code = await generate_audit_code(db)
    
    # Calculate expected items for the warehouse
    expected_count = await db.serial_units.count_documents({
        "warehouse_id": data.warehouse_id,
        "status": "available"
    })
    
    doc = {
        "audit_code": code,
        "warehouse_id": data.warehouse_id,
        "started_by": str(current_user["_id"]),
        "status": AuditStatus.IN_PROGRESS.value,
        "expected_items": expected_count,
        "scanned_items": 0,
        "scanned_serials": [], # track scanned serials
        "discrepancies": [],
        "notes": data.notes,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.audit_sessions.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_audit_session(doc)


@router.get("")
async def list_audit_sessions(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    warehouse_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    db = get_db()
    query = {}
    if warehouse_id:
        query["warehouse_id"] = warehouse_id
        
    skip = (page - 1) * limit
    total = await db.audit_sessions.count_documents(query)
    cursor = db.audit_sessions.find(query).skip(skip).limit(limit).sort("created_at", -1)
    
    sessions = []
    async for doc in cursor:
        sessions.append(serialize_audit_session(doc))
        
    return {"sessions": sessions, "total": total, "page": page, "limit": limit}


@router.get("/{session_id}")
async def get_audit_session(session_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    try:
        oid = ObjectId(session_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid session ID")
        
    session = await db.audit_sessions.find_one({"_id": oid})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    return serialize_audit_session(session)


@router.post("/{session_id}/scan")
async def scan_serial(session_id: str, data: AuditScanRequest, current_user: dict = Depends(get_current_user)):
    db = get_db()
    try:
        oid = ObjectId(session_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid session ID")
        
    session = await db.audit_sessions.find_one({"_id": oid})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    if session["status"] != AuditStatus.IN_PROGRESS.value:
        raise HTTPException(status_code=400, detail="Can only scan in an in_progress session")
        
    serial = data.serial_number
    if serial in session.get("scanned_serials", []):
        raise HTTPException(status_code=400, detail="Serial already scanned in this session")
        
    # verify if serial exists
    unit = await db.serial_units.find_one({"serial_number": serial})
    if not unit:
        raise HTTPException(status_code=404, detail="Serial unit not found in system")
        
    if unit.get("warehouse_id") != session["warehouse_id"]:
        # Wrong warehouse! But we still record it.
        pass
        
    now = datetime.now(timezone.utc)
    await db.audit_sessions.update_one(
        {"_id": oid},
        {
            "$push": {"scanned_serials": serial},
            "$inc": {"scanned_items": 1},
            "$set": {"updated_at": now}
        }
    )
    
    return {"message": "Scanned successfully", "serial": serial}


@router.post("/{session_id}/complete")
async def complete_audit_session(session_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    try:
        oid = ObjectId(session_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid session ID")
        
    session = await db.audit_sessions.find_one({"_id": oid})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    if session["status"] != AuditStatus.IN_PROGRESS.value:
        raise HTTPException(status_code=400, detail="Session already completed or cancelled")
        
    # Calculate discrepancies
    warehouse_id = session["warehouse_id"]
    scanned_serials = set(session.get("scanned_serials", []))
    
    # Get all expected serials for this warehouse that are 'available'
    cursor = db.serial_units.find({"warehouse_id": warehouse_id, "status": "available"})
    expected_serials = set()
    async for doc in cursor:
        expected_serials.add(doc.get("serial_number"))
        
    missing_serials = expected_serials - scanned_serials
    extra_serials = scanned_serials - expected_serials
    
    discrepancies = []
    for s in missing_serials:
        discrepancies.append({"serial_number": s, "type": "missing", "expected": True, "scanned": False})
    for s in extra_serials:
        discrepancies.append({"serial_number": s, "type": "extra", "expected": False, "scanned": True})
        
    now = datetime.now(timezone.utc)
    await db.audit_sessions.update_one(
        {"_id": oid},
        {
            "$set": {
                "status": AuditStatus.COMPLETED.value,
                "discrepancies": discrepancies,
                "updated_at": now
            }
        }
    )
    
    updated = await db.audit_sessions.find_one({"_id": oid})
    return serialize_audit_session(updated)
