# Copyright (C) 2026 gbao86 <tiktokthu10@gmail.com>
# This file is part of the chims project.
# Licensed under the GNU General Public License v3.0; see LICENSE for details.
from fastapi import APIRouter, HTTPException, status, Depends, Response, Request
from passlib.context import CryptContext

from app.database import get_db
from app.auth.jwt_handler import create_access_token
from app.auth.dependencies import get_current_user
from app.models.user import LoginRequest, UserResponse, UpdateProfileRequest

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


@router.post("/login")
async def login(request: LoginRequest, response: Response, raw_request: Request):
    """Authenticate user, return JWT token, and set HttpOnly cookie."""
    db = get_db()
    user = await db.users.find_one({"username": request.username})

    if not user or not pwd_context.verify(request.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": str(user["_id"])})

    # Set cookie. If HTTPS, use secure=True and samesite="none" for cross-origin deployments.
    # If HTTP (localhost), use secure=False and samesite="lax" so local dev doesn't block it.
    is_https = raw_request.url.scheme == "https" or raw_request.headers.get("x-forwarded-proto") == "https"
    
    response.set_cookie(
        key="chims_token",
        value=access_token,
        httponly=True,
        max_age=1440 * 60,  # 1 day
        expires=1440 * 60,
        samesite="none" if is_https else "lax",
        secure=is_https,
    )

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


@router.post("/logout")
async def logout(response: Response):
    """Clear JWT HttpOnly cookie."""
    response.delete_cookie(key="chims_token", samesite="lax", secure=False)
    response.delete_cookie(key="chims_token", samesite="none", secure=True)
    return {"message": "Successfully logged out"}
