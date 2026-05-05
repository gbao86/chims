# Copyright (C) 2026 gbao86 <tiktokthu10@gmail.com>
# This file is part of the chims project.
# Licensed under the GNU General Public License v3.0; see LICENSE for details.
from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum
from datetime import datetime


class WarrantyStatus(str, Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    CLAIMED = "claimed"
    VOID = "void"


class WarrantyClaim(BaseModel):
    date: datetime
    issue: str
    resolution: str = ""
    cost: float = 0


class WarrantyCreate(BaseModel):
    sales_order_id: str
    customer_id: str
    inventory_id: str
    serial_number: str
    product_name: str
    warranty_months: int = 24


class WarrantyClaimRequest(BaseModel):
    warranty_id: str
    issue: str


class WarrantyResponse(BaseModel):
    id: str
    warranty_code: str
    sales_order_id: str
    customer_id: str
    customer_name: str = ""
    inventory_id: str
    serial_number: str
    product_name: str
    purchase_date: datetime
    warranty_months: int
    expiry_date: datetime
    status: WarrantyStatus
    claims: List[WarrantyClaim] = []
    created_at: datetime
    updated_at: datetime

