# Copyright (C) 2026 gbao86 <tiktokthu10@gmail.com>
# This file is part of the chims project.
# Licensed under the GNU General Public License v3.0; see LICENSE for details.
from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum
from datetime import datetime


class CustomerType(str, Enum):
    INDIVIDUAL = "individual"
    BUSINESS = "business"


class CustomerCreate(BaseModel):
    name: str
    phone: str
    email: str = ""
    address: str = ""
    type: CustomerType = CustomerType.INDIVIDUAL


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    type: Optional[CustomerType] = None


class CustomerResponse(BaseModel):
    id: str
    code: str
    name: str
    phone: str
    email: str
    address: str
    type: CustomerType
    total_spent: float
    order_count: int
    created_at: datetime
    updated_at: datetime

