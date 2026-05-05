# Copyright (C) 2026 gbao86 <tiktokthu10@gmail.com>
# This file is part of the chims project.
# Licensed under the GNU General Public License v3.0; see LICENSE for details.
from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum
from datetime import datetime


class POStatus(str, Enum):
    DRAFT = "draft"
    APPROVED = "approved"
    RECEIVED = "received"
    CANCELLED = "cancelled"


class POItem(BaseModel):
    inventory_id: str
    name: str = ""
    quantity: int = Field(ge=1)
    unit_cost: float = Field(ge=0)


class PurchaseOrderCreate(BaseModel):
    supplier_id: str
    items: List[POItem]
    notes: str = ""


class PurchaseOrderStatusUpdate(BaseModel):
    status: POStatus


class PurchaseOrderResponse(BaseModel):
    id: str
    po_number: str
    supplier_id: str
    supplier_name: str = ""
    items: List[POItem]
    total_amount: float
    status: POStatus
    received_by: Optional[str] = None
    received_by_name: Optional[str] = None
    notes: str
    created_at: datetime
    updated_at: datetime

