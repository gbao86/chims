from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from enum import Enum
from datetime import datetime


class Category(str, Enum):
    CPU = "CPU"
    GPU = "GPU"
    RAM = "RAM"
    STORAGE = "Storage"
    MAINBOARD = "Mainboard"
    PSU = "PSU"
    CASE = "Case"
    COOLING = "Cooling"
    MONITOR = "Monitor"
    KEYBOARD = "Keyboard"
    MOUSE = "Mouse"
    HEADSET = "Headset"
    OTHER = "Other"


class StockStatus(str, Enum):
    IN_STOCK = "in_stock"
    LOW_STOCK = "low_stock"
    OUT_OF_STOCK = "out_of_stock"


class InventoryCreate(BaseModel):
    sku_code: str
    name: str
    category: Category
    brand: str = ""
    image_url: str = ""
    image_urls: List[str] = Field(default_factory=list)
    specs: Dict[str, Any] = Field(default_factory=dict)
    stock_quantity: int = Field(ge=0, default=0)
    min_stock: int = Field(ge=0, default=5)
    cost_price: float = Field(ge=0, default=0.0)
    unit_price: float = Field(ge=0, default=0.0)
    warranty_months: int = Field(ge=0, default=24)
    location: str = ""
    barcode: str = ""


class InventoryUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[Category] = None
    brand: Optional[str] = None
    image_url: Optional[str] = None
    image_urls: Optional[List[str]] = None
    specs: Optional[Dict[str, Any]] = None
    stock_quantity: Optional[int] = Field(ge=0, default=None)
    min_stock: Optional[int] = Field(ge=0, default=None)
    cost_price: Optional[float] = Field(ge=0, default=None)
    unit_price: Optional[float] = Field(ge=0, default=None)
    warranty_months: Optional[int] = Field(ge=0, default=None)
    location: Optional[str] = None
    barcode: Optional[str] = None


class InventoryResponse(BaseModel):
    id: str
    sku_code: str
    name: str
    category: Category
    brand: str
    image_url: str
    image_urls: List[str] = Field(default_factory=list)
    specs: Dict[str, Any]
    stock_quantity: int
    min_stock: int
    cost_price: float
    unit_price: float
    warranty_months: int
    location: str
    barcode: str
    status: StockStatus
    created_at: datetime
    updated_at: datetime


def compute_stock_status(quantity: int, min_stock: int = 5) -> StockStatus:
    """Determine stock status based on quantity and minimum threshold."""
    if quantity <= 0:
        return StockStatus.OUT_OF_STOCK
    elif quantity <= min_stock:
        return StockStatus.LOW_STOCK
    return StockStatus.IN_STOCK
