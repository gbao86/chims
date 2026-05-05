# Copyright (C) 2026 gbao86 <tiktokthu10@gmail.com>
# This file is part of the chims project.
# Licensed under the GNU General Public License v3.0; see LICENSE for details.
from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum
from datetime import datetime


class BuildStatus(str, Enum):
    DRAFT = "draft"
    ASSEMBLED = "assembled"
    SOLD = "sold"
    CANCELLED = "cancelled"


class CompatibilityLevel(str, Enum):
    COMPATIBLE = "compatible"
    WARNING = "warning"
    ERROR = "error"


class PCBuildComponent(BaseModel):
    category: str
    inventory_id: str
    serial_unit_id: str = ""
    product_name: str = ""
    sku_code: str = ""
    quantity: int = Field(ge=1, default=1)
    unit_price: float = Field(ge=0, default=0)


class PCBuildCreate(BaseModel):
    build_name: str
    components: List[PCBuildComponent]
    notes: str = ""


class PCBuildUpdate(BaseModel):
    build_name: Optional[str] = None
    components: Optional[List[PCBuildComponent]] = None
    notes: Optional[str] = None


class CompatibilityCheckRequest(BaseModel):
    components: List[PCBuildComponent]


class CompatibilityResult(BaseModel):
    level: CompatibilityLevel
    notes: List[str] = []
    total_tdp: int = 0
    recommended_psu: int = 0
    total_price: float = 0


class PCBuildResponse(BaseModel):
    id: str
    build_code: str
    build_name: str
    components: List[PCBuildComponent]
    total_price: float
    total_tdp: int = 0
    recommended_psu: int = 0
    compatibility_status: CompatibilityLevel = CompatibilityLevel.COMPATIBLE
    compatibility_notes: List[str] = []
    status: BuildStatus
    assembled_by: str = ""
    assembled_by_name: str = ""
    notes: str = ""
    created_at: datetime
    updated_at: datetime

