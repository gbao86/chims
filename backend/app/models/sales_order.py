# Copyright (C) 2026 gbao86 <tiktokthu10@gmail.com>
# This file is part of the chims project.
# Licensed under the GNU General Public License v3.0; see LICENSE for details.
from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum
from datetime import datetime


class SalesStatus(str, Enum):
    DRAFT = "draft"
    CONFIRMED = "confirmed"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


class PaymentMethod(str, Enum):
    CASH = "cash"
    TRANSFER = "transfer"
    CARD = "card"


class SalesItem(BaseModel):
    inventory_id: str
    name: str = ""
    quantity: int = Field(ge=1)
    unit_price: float = Field(ge=0)
    discount: float = Field(ge=0, default=0)


class SalesOrderCreate(BaseModel):
    customer_id: Optional[str] = None
    customer_name: str = ""
    customer_phone: str = ""
    items: List[SalesItem]
    discount_total: float = 0
    payment_method: PaymentMethod = PaymentMethod.CASH
    notes: str = ""


class SalesStatusUpdate(BaseModel):
    status: SalesStatus


class SalesOrderResponse(BaseModel):
    id: str
    invoice_number: str
    customer_id: Optional[str] = None
    customer_name: str
    customer_phone: str
    items: List[SalesItem]
    subtotal: float
    discount_total: float
    total_amount: float
    payment_method: PaymentMethod
    status: SalesStatus
    sold_by: Optional[str] = None
    sold_by_name: Optional[str] = None
    notes: str
    created_at: datetime
    updated_at: datetime

