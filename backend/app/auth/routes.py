# Copyright (C) 2026 gbao86 <tiktokthu10@gmail.com>
# This file is part of the chims project.
# Licensed under the GNU General Public License v3.0; see LICENSE for details.
from fastapi import APIRouter, HTTPException, status, Depends
from passlib.context import CryptContext

from app.database import get_db
from app.auth.jwt_handler import create_access_token
from app.auth.dependencies import get_current_user
from app.models.user import LoginRequest, UserResponse, UpdateProfileRequest

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


@router.put('/profile', response_model=UserResponse)
async def update_profile(request: UpdateProfileRequest, current_user: dict = Depends(get_current_user)):
    """Update user profile."""
    db = get_db()
    
    result = await db.users.update_one(
        {'_id': current_user['_id']},
        {'$set': {'full_name': request.full_name}}
    )
    
    if result.modified_count == 0 and result.matched_count == 0:
        raise HTTPException(status_code=404, detail='User not found')
        
    updated_user = await db.users.find_one({'_id': current_user['_id']})
    return UserResponse(
        id=str(updated_user['_id']),
        username=updated_user['username'],
        full_name=updated_user['full_name'],
        role=updated_user['role'],
    )
