# Copyright (C) 2026 gbao86 <tiktokthu10@gmail.com>
# This file is part of the chims project.
# Licensed under the GNU General Public License v3.0; see LICENSE for details.
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum

class AuditStatus(str, Enum):
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class Discrepancy(BaseModel):
    inventory_id: str
    expected_quantity: int
    scanned_quantity: int
    difference: int
    notes: Optional[str] = None

class AuditSessionCreate(BaseModel):
    warehouse_id: str
    notes: Optional[str] = None

class AuditScanRequest(BaseModel):
    serial_number: str

class AuditSessionUpdate(BaseModel):
    status: Optional[AuditStatus] = None
    notes: Optional[str] = None

class LiquidationAlert(BaseModel):
    inventory_id: str
    reason: str
    days_in_stock: int
    suggested_discount: float
    auto_generated: bool = True

