# Copyright (C) 2026 gbao86 <tiktokthu10@gmail.com>
# This file is part of the chims project.
# Licensed under the GNU General Public License v3.0; see LICENSE for details.
from fastapi import APIRouter, HTTPException, status
from passlib.context import CryptContext

from app.database import get_db
from app.auth.jwt_handler import create_access_token
from app.models.user import LoginRequest, UserResponse

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


@router.post("/login")
async def login(request: LoginRequest):
    """Authenticate user and return JWT token."""
    db = get_db()
    user = await db.users.find_one({"username": request.username})

    if not user or not pwd_context.verify(request.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": str(user["_id"])})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse(
            id=str(user["_id"]),
            username=user["username"],
            full_name=user["full_name"],
            role=user["role"],
        ).model_dump(),
    }

