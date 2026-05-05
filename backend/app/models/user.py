from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum
from datetime import datetime


class UserRole(str, Enum):
    ADMIN = "admin"
    TECHNICIAN = "technician"
    SALES = "sales"


class LoginRequest(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    id: str
    username: str
    full_name: str
    role: UserRole


class UserCreate(BaseModel):
    username: str
    password: str
    full_name: str
    role: UserRole = UserRole.TECHNICIAN


class UserInDB(BaseModel):
    username: str
    password_hash: str
    full_name: str
    role: UserRole
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
