# Copyright (C) 2026 gbao86 <tiktokthu10@gmail.com>
# This file is part of the chims project.
# Licensed under the GNU General Public License v3.0; see LICENSE for details.
from fastapi import APIRouter, Depends, HTTPException, Query, status
from bson import ObjectId
from datetime import datetime, timezone
from typing import Optional

from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.pc_build import PCBuildCreate, PCBuildUpdate, CompatibilityCheckRequest, BuildStatus
from app.services.compatibility import check_compatibility
from app.models.serial_unit import SerialStatus

router = APIRouter()


def serialize_build(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "build_code": doc.get("build_code", ""),
        "build_name": doc.get("build_name", ""),
        "components": doc.get("components", []),
        "total_price": doc.get("total_price", 0),
        "total_tdp": doc.get("total_tdp", 0),
        "recommended_psu": doc.get("recommended_psu", 0),
        "compatibility_status": doc.get("compatibility_status", "compatible"),
        "compatibility_notes": doc.get("compatibility_notes", []),
        "status": doc.get("status", "draft"),
        "assembled_by": doc.get("assembled_by", ""),
        "assembled_by_name": doc.get("assembled_by_name", ""),
        "notes": doc.get("notes", ""),
        "created_at": doc["created_at"],
        "updated_at": doc["updated_at"],
    }


async def generate_build_code(db) -> str:
    last = await db.pc_builds.find_one(sort=[("created_at", -1)])
    if last and "build_code" in last:
        try:
            num = int(last["build_code"].split("-")[1])
            return f"BUILD-{num + 1:04d}"
        except (IndexError, ValueError):
            pass
    return "BUILD-0001"


async def _enrich_components(db, components: list) -> list:
    enriched = []
    for comp in components:
        c = dict(comp)
        if comp.get("inventory_id"):
            try:
                inv = await db.inventory.find_one({"_id": ObjectId(comp["inventory_id"])})
                if inv:
                    c["product_name"] = inv.get("name", "")
                    c["sku_code"] = inv.get("sku_code", "")
                    c["specs"] = inv.get("specs", {})
                    if not c.get("unit_price"):
                        c["unit_price"] = inv.get("unit_price", 0)
            except Exception:
                pass
        enriched.append(c)
    return enriched


@router.get("")
async def list_builds(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status_filter: Optional[BuildStatus] = Query(None, alias="status"),
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    query = {}
    if status_filter:
        query["status"] = status_filter.value
    if search:
        query["$or"] = [
            {"build_name": {"$regex": search, "$options": "i"}},
            {"build_code": {"$regex": search, "$options": "i"}},
        ]
    skip = (page - 1) * limit
    total = await db.pc_builds.count_documents(query)
    cursor = db.pc_builds.find(query).skip(skip).limit(limit).sort("created_at", -1)
    builds = []
    async for doc in cursor:
        builds.append(serialize_build(doc))
    return {"builds": builds, "total": total, "page": page, "limit": limit}


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_build(data: PCBuildCreate, current_user: dict = Depends(get_current_user)):
    db = get_db()
    enriched = await _enrich_components(db, [c.model_dump() for c in data.components])
    level, notes, total_tdp, recommended_psu, total_price = check_compatibility(enriched)
    code = await generate_build_code(db)
    now = datetime.now(timezone.utc)
    components_data = []
    for c in enriched:
        components_data.append({
            "category": c.get("category", ""), "inventory_id": c.get("inventory_id", ""),
            "serial_unit_id": c.get("serial_unit_id", ""), "product_name": c.get("product_name", ""),
            "sku_code": c.get("sku_code", ""), "quantity": c.get("quantity", 1), "unit_price": c.get("unit_price", 0),
        })
    doc = {
        "build_code": code, "build_name": data.build_name, "components": components_data,
        "total_price": total_price, "total_tdp": total_tdp, "recommended_psu": recommended_psu,
        "compatibility_status": level, "compatibility_notes": notes, "status": BuildStatus.DRAFT.value,
        "assembled_by": str(current_user["_id"]), "assembled_by_name": current_user.get("full_name", ""),
        "notes": data.notes, "created_at": now, "updated_at": now,
    }
    result = await db.pc_builds.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_build(doc)


@router.post("/check-compatibility")
async def check_build_compatibility(data: CompatibilityCheckRequest, current_user: dict = Depends(get_current_user)):
    db = get_db()
    enriched = await _enrich_components(db, [c.model_dump() for c in data.components])
    level, notes, total_tdp, recommended_psu, total_price = check_compatibility(enriched)
    return {"level": level, "notes": notes, "total_tdp": total_tdp, "recommended_psu": recommended_psu, "total_price": total_price}


@router.post("/{build_id}/assemble")
async def assemble_build(build_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    try:
        oid = ObjectId(build_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid build ID")
    build = await db.pc_builds.find_one({"_id": oid})
    if not build:
        raise HTTPException(status_code=404, detail="Build not found")
    if build["status"] != BuildStatus.DRAFT.value:
        raise HTTPException(status_code=400, detail="Only draft builds can be assembled")
    now = datetime.now(timezone.utc)
    for comp in build.get("components", []):
        serial_id = comp.get("serial_unit_id")
        if serial_id:
            try:
                await db.serial_units.update_one(
                    {"_id": ObjectId(serial_id), "status": SerialStatus.AVAILABLE.value},
                    {"$set": {"status": SerialStatus.IN_BUILD.value, "build_id": build_id, "updated_at": now}},
                )
            except Exception:
                pass
    await db.pc_builds.update_one({"_id": oid}, {"$set": {
        "status": BuildStatus.ASSEMBLED.value, "assembled_by": str(current_user["_id"]),
        "assembled_by_name": current_user.get("full_name", ""), "updated_at": now,
    }})
    updated = await db.pc_builds.find_one({"_id": oid})
    return serialize_build(updated)


@router.get("/{build_id}")
async def get_build(build_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    try:
        oid = ObjectId(build_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid build ID")
    build = await db.pc_builds.find_one({"_id": oid})
    if not build:
        raise HTTPException(status_code=404, detail="Build not found")
    return serialize_build(build)


@router.delete("/{build_id}")
async def delete_build(build_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    try:
        oid = ObjectId(build_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid build ID")
    build = await db.pc_builds.find_one({"_id": oid})
    if not build:
        raise HTTPException(status_code=404, detail="Build not found")
    if build["status"] == BuildStatus.ASSEMBLED.value:
        for comp in build.get("components", []):
            serial_id = comp.get("serial_unit_id")
            if serial_id:
                try:
                    await db.serial_units.update_one(
                        {"_id": ObjectId(serial_id)},
                        {"$set": {"status": SerialStatus.AVAILABLE.value, "build_id": "", "updated_at": datetime.now(timezone.utc)}},
                    )
                except Exception:
                    pass
    await db.pc_builds.delete_one({"_id": oid})
    return {"message": "Build deleted successfully"}

