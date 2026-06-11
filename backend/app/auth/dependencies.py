# Copyright (C) 2026 gbao86 <tiktokthu10@gmail.com>
# This file is part of the chims project.
# Licensed under the GNU General Public License v3.0; see LICENSE for details.
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from bson import ObjectId

from app.auth.jwt_handler import verify_token
from app.database import get_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


async def get_current_user(request: Request):
    """Dependency: Extract and validate the current user from JWT token (Header or Cookie)."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    token = None
    # 1. Check Authorization header
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
    
    # 2. Check Cookie
    if not token:
        token = request.cookies.get("chims_token")

    if not token:
        raise credentials_exception

    payload = verify_token(token)
    if payload is None:
        raise credentials_exception

    user_id = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    db = get_db()
    user = await db.users.find_one({"_id": ObjectId(user_id)})

    if user is None:
        raise credentials_exception

    user["_id"] = str(user["_id"])
    user.pop("password_hash", None)

    # Demo account protection: prevent all database modifications (POST/PUT/PATCH/DELETE)
    if user.get("username") == "demo":
        if request.method in ("POST", "PUT", "PATCH", "DELETE"):
            path = request.url.path.rstrip("/")
            if path not in ("/api/builds/check-compatibility", "/api/builds/ai-analyze"):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Tài khoản demo chỉ có quyền xem, không thể thực hiện thao tác này.",
                )

    return user


async def require_admin(current_user: dict = Depends(get_current_user)):
    """Dependency: Require the current user to have admin role."""
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user

