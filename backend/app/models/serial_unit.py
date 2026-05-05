# Copyright (C) 2026 gbao86 <tiktokthu10@gmail.com>
# This file is part of the chims project.
# Licensed under the GNU General Public License v3.0; see LICENSE for details.
from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum
from datetime import datetime


class ItemCondition(str, Enum):
    NEW = "new"
    DEMO = "demo"
    RMA = "rma"
    USED = "used"


class SerialStatus(str, Enum):
    AVAILABLE = "available"
    SOLD = "sold"
    RMA = "rma"
    RESERVED = "reserved"
    IN_BUILD = "in_build"


class SerialUnitCreate(BaseModel):
    serial_number: str
    inventory_id: str
    condition: ItemCondition = ItemCondition.NEW
    purchase_order_id: str = ""
    warehouse_id: str = ""
    location_code: str = ""
    notes: str = ""


class SerialUnitBulkCreate(BaseModel):
    inventory_id: str
    serial_numbers: List[str]
    condition: ItemCondition = ItemCondition.NEW
    purchase_order_id: str = ""
    warehouse_id: str = ""
    location_code: str = ""


class SerialUnitUpdate(BaseModel):
    condition: Optional[ItemCondition] = None
    status: Optional[SerialStatus] = None
    warehouse_id: Optional[str] = None
    location_code: Optional[str] = None
    notes: Optional[str] = None


class SerialUnitResponse(BaseModel):
    id: str
    serial_number: str
    inventory_id: str
    product_name: str = ""
    sku_code: str = ""
    category: str = ""
    condition: ItemCondition
    status: SerialStatus
    purchase_order_id: str = ""
    warehouse_id: str = ""
    warehouse_name: str = ""
    location_code: str = ""
    sold_to_order_id: str = ""
    warranty_id: str = ""
    build_id: str = ""
    notes: str = ""
    created_at: datetime
    updated_at: datetime

