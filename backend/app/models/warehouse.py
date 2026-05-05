from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum
from datetime import datetime


class WarehouseType(str, Enum):
    MAIN = "main"
    BRANCH = "branch"
    DISPLAY = "display"


class LocationZone(str, Enum):
    RECEIVING = "receiving"
    STORAGE = "storage"
    DISPLAY = "display"
    SHIPPING = "shipping"


class WarehouseCreate(BaseModel):
    name: str
    address: str = ""
    type: WarehouseType = WarehouseType.MAIN
    manager_id: str = ""
    phone: str = ""


class WarehouseUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    type: Optional[WarehouseType] = None
    manager_id: Optional[str] = None
    phone: Optional[str] = None


class WarehouseLocationCreate(BaseModel):
    warehouse_id: str
    location_code: str
    zone: LocationZone = LocationZone.STORAGE
    capacity: int = Field(ge=0, default=50)
    description: str = ""


class WarehouseLocationUpdate(BaseModel):
    zone: Optional[LocationZone] = None
    capacity: Optional[int] = Field(ge=0, default=None)
    description: Optional[str] = None


class TransferRequest(BaseModel):
    serial_unit_ids: List[str]
    from_warehouse_id: str
    to_warehouse_id: str
    to_location_code: str = ""
    reason: str = ""


class WarehouseResponse(BaseModel):
    id: str
    code: str
    name: str
    address: str
    type: WarehouseType
    manager_id: str = ""
    manager_name: str = ""
    phone: str = ""
    total_items: int = 0
    created_at: datetime
    updated_at: datetime


class WarehouseLocationResponse(BaseModel):
    id: str
    warehouse_id: str
    warehouse_name: str = ""
    location_code: str
    zone: LocationZone
    capacity: int
    current_count: int = 0
    description: str = ""
    created_at: datetime
    updated_at: datetime
