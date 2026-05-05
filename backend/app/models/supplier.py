from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum
from datetime import datetime


class SupplierStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"


class SupplierContact(BaseModel):
    person: str = ""
    phone: str = ""
    email: str = ""


class SupplierCreate(BaseModel):
    name: str
    contact: SupplierContact = SupplierContact()
    address: str = ""
    notes: str = ""


class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    contact: Optional[SupplierContact] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[SupplierStatus] = None


class SupplierResponse(BaseModel):
    id: str
    code: str
    name: str
    contact: SupplierContact
    address: str
    notes: str
    rating: float
    total_orders: int
    status: SupplierStatus
    created_at: datetime
    updated_at: datetime
