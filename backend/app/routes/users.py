# Copyright (C) 2026 gbao86 <tiktokthu10@gmail.com>
# This file is part of the chims project.
# Licensed under the GNU General Public License v3.0; see LICENSE for details.
from fastapi import APIRouter, Depends, HTTPException, Query, status
from bson import ObjectId
from datetime import datetime, timezone
from typing import Optional
from passlib.context import CryptContext
from pydantic import BaseModel

from app.database import get_db
from app.auth.dependencies import get_current_user

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ALLOWED_ROLES = {"admin", "technician", "sales"}


def serialize_user(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "username": doc.get("username", ""),
        "full_name": doc.get("full_name", ""),
        "role": doc.get("role", "sales"),
        "email": doc.get("email", ""),
        "phone": doc.get("phone", ""),
        "is_active": doc.get("is_active", True),
        "created_at": doc.get("created_at"),
        "updated_at": doc.get("updated_at"),
    }


def require_admin(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ Admin mới có quyền thực hiện thao tác này.",
        )
    return current_user


class UserCreate(BaseModel):
    username: str
    full_name: str
    password: str
    role: str = "sales"
    email: str = ""
    phone: str = ""


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None


class PasswordReset(BaseModel):
    new_password: str


# ── List all users (admin only) ──────────────────────────────────────────────
@router.get("")
async def list_users(
    search: Optional[str] = None,
    role: Optional[str] = None,
    _admin: dict = Depends(require_admin),
):
    db = get_db()
    query: dict = {}
    if role and role in ALLOWED_ROLES:
        query["role"] = role
    if search:
        query["$or"] = [
            {"username": {"$regex": search, "$options": "i"}},
            {"full_name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
        ]
    cursor = db.users.find(query).sort("created_at", -1)
    users = []
    async for doc in cursor:
        users.append(serialize_user(doc))
    return {"users": users, "total": len(users)}


# ── Create new user (admin only) ─────────────────────────────────────────────
@router.post("", status_code=status.HTTP_201_CREATED)
async def create_user(
    data: UserCreate,
    _admin: dict = Depends(require_admin),
):
    db = get_db()
    if data.role not in ALLOWED_ROLES:
        raise HTTPException(status_code=400, detail=f"Role không hợp lệ. Chọn: {ALLOWED_ROLES}")
    existing = await db.users.find_one({"username": data.username})
    if existing:
        raise HTTPException(status_code=409, detail="Tên đăng nhập đã tồn tại.")
    now = datetime.now(timezone.utc)
    doc = {
        "username": data.username.strip(),
        "full_name": data.full_name.strip(),
        "password_hash": pwd_context.hash(data.password),
        "role": data.role,
        "email": data.email.strip(),
        "phone": data.phone.strip(),
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.users.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_user(doc)


# ── Update user info (admin only) ─────────────────────────────────────────────
@router.put("/{user_id}")
async def update_user(
    user_id: str,
    data: UserUpdate,
    _admin: dict = Depends(require_admin),
):
    db = get_db()
    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="ID không hợp lệ")
    
    user = await db.users.find_one({"_id": oid})
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
    if user.get("username") == "demo":
        raise HTTPException(status_code=403, detail="Không được phép chỉnh sửa tài khoản demo")

    update = {k: v for k, v in data.model_dump().items() if v is not None}
    if "role" in update and update["role"] not in ALLOWED_ROLES:
        raise HTTPException(status_code=400, detail=f"Role không hợp lệ.")
    update["updated_at"] = datetime.now(timezone.utc)
    await db.users.update_one({"_id": oid}, {"$set": update})
    updated = await db.users.find_one({"_id": oid})
    return serialize_user(updated)


# ── Reset password (admin only) ───────────────────────────────────────────────
@router.post("/{user_id}/reset-password")
async def reset_password(
    user_id: str,
    data: PasswordReset,
    _admin: dict = Depends(require_admin),
):
    db = get_db()
    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="ID không hợp lệ")
    
    user = await db.users.find_one({"_id": oid})
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
    if user.get("username") == "demo":
        raise HTTPException(status_code=403, detail="Không được phép đổi mật khẩu tài khoản demo")

    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Mật khẩu phải ít nhất 6 ký tự")
    await db.users.update_one(
        {"_id": oid},
        {"$set": {"password_hash": pwd_context.hash(data.new_password), "updated_at": datetime.now(timezone.utc)}},
    )
    return {"message": "Đặt lại mật khẩu thành công"}


# ── Toggle active/inactive (admin only) ───────────────────────────────────────
@router.patch("/{user_id}/toggle-active")
async def toggle_active(
    user_id: str,
    current_admin: dict = Depends(require_admin),
):
    db = get_db()
    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="ID không hợp lệ")
    # Prevent admin from deactivating themselves
    if str(current_admin["_id"]) == user_id:
        raise HTTPException(status_code=400, detail="Không thể tự vô hiệu hóa tài khoản của mình")
    
    user = await db.users.find_one({"_id": oid})
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
    if user.get("username") == "demo":
        raise HTTPException(status_code=403, detail="Không được phép vô hiệu hóa tài khoản demo")

    new_status = not user.get("is_active", True)
    await db.users.update_one(
        {"_id": oid},
        {"$set": {"is_active": new_status, "updated_at": datetime.now(timezone.utc)}},
    )
    return {"is_active": new_status}


# ── Delete user (admin only) ──────────────────────────────────────────────────
@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    current_admin: dict = Depends(require_admin),
):
    db = get_db()
    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="ID không hợp lệ")
    if str(current_admin["_id"]) == user_id:
        raise HTTPException(status_code=400, detail="Không thể xóa tài khoản của chính mình")
    
    user = await db.users.find_one({"_id": oid})
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
    if user.get("username") == "demo":
        raise HTTPException(status_code=403, detail="Không được phép xóa tài khoản demo")

    await db.users.delete_one({"_id": oid})
    return {"message": "Đã xóa tài khoản"}
