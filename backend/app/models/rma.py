# Copyright (C) 2026 gbao86 <tiktokthu10@gmail.com>
# This file is part of the chims project.
# Licensed under the GNU General Public License v3.0; see LICENSE for details.
from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum
from datetime import datetime


class RMAStatus(str, Enum):
    RECEIVED = "received"
    SENT_TO_VENDOR = "sent_to_vendor"
    VENDOR_PROCESSING = "vendor_processing"
    RETURNED_FROM_VENDOR = "returned_from_vendor"
    RETURNED_TO_CUSTOMER = "returned_to_customer"
    REPLACED = "replaced"
    REJECTED = "rejected"


class RMAEvent(BaseModel):
    timestamp: datetime
    status: RMAStatus
    note: str = ""
    performed_by: str = ""


class RMACreate(BaseModel):
    warranty_id: str = ""
    serial_number: str
    customer_id: str = ""
    customer_name: str = ""
    customer_phone: str = ""
    product_name: str = ""
    issue_description: str
    vendor_name: str = ""


class RMAStatusUpdate(BaseModel):
    status: RMAStatus
    note: str = ""
    vendor_tracking: str = ""
    replacement_serial: str = ""
    estimated_return_date: Optional[datetime] = None


class RMALookupRequest(BaseModel):
    query: str  # Serial number OR phone number


class RMAResponse(BaseModel):
    id: str
    rma_code: str
    warranty_id: str = ""
    warranty_code: str = ""
    serial_number: str
    customer_id: str = ""
    customer_name: str = ""
    customer_phone: str = ""
    product_name: str = ""
    issue_description: str
    status: RMAStatus
    timeline: List[RMAEvent] = []
    vendor_name: str = ""
    vendor_tracking: str = ""
    replacement_serial: str = ""
    estimated_return_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

