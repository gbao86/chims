from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum
from datetime import datetime


class TicketStatus(str, Enum):
    PENDING = "pending"
    DIAGNOSING = "diagnosing"
    WAITING_PARTS = "waiting_parts"
    COMPLETED = "completed"


class CustomerInfo(BaseModel):
    name: str
    phone: str


class PartUsed(BaseModel):
    inventory_id: str
    name: Optional[str] = None
    quantity: int = Field(ge=1)
    price: float = Field(ge=0)


class TicketCreate(BaseModel):
    customer_info: CustomerInfo
    device_info: str
    issue_description: str
    technician_id: Optional[str] = None


class TicketStatusUpdate(BaseModel):
    status: TicketStatus


class AddPartsRequest(BaseModel):
    parts: List[PartUsed]


class TicketResponse(BaseModel):
    id: str
    ticket_id: str
    customer_info: CustomerInfo
    device_info: str
    issue_description: str
    status: TicketStatus
    technician_id: Optional[str] = None
    technician_name: Optional[str] = None
    parts_used: List[PartUsed] = []
    total_cost: float = 0.0
    created_at: datetime
    updated_at: datetime
