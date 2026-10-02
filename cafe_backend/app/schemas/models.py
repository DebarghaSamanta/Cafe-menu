from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


# =========================================================
# TABLES
# =========================================================

class TableStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"


class TableResponse(BaseModel):
    id: str
    table_number: int = Field(ge=1)
    is_active: bool = True


class TableContextResponse(BaseModel):
    table_id: str
    table_number: int
    is_active: bool

    model_config = ConfigDict(extra="forbid")


# =========================================================
# MENU
# =========================================================

class MenuItemResponse(BaseModel):
    id: str

    name: str = Field(
        min_length=1,
        max_length=100,
    )

    description: str = Field(
        min_length=1,
        max_length=500,
    )

    category: str = Field(
        min_length=1,
        max_length=50,
    )

    # Public API value is in rupees.
    # Database value remains price_paise.
    price: float = Field(ge=0)

    stock_quantity: int = 50

    is_available: bool


class MenuResponse(BaseModel):
    items: list[MenuItemResponse]

    model_config = ConfigDict(extra="forbid")


# =========================================================
# ORDERS
# =========================================================

class OrderStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    PREPARING = "preparing"
    READY = "ready"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

MAX_ORDER_ITEM_QUANTITY = 10
MAX_DISTINCT_ORDER_ITEMS = 50

class CreateOrderItemRequest(BaseModel):
    menu_item_id: str = Field(
        min_length=1,
        max_length=100,
    )

    quantity: int = Field(
        ge=1,
        le=MAX_ORDER_ITEM_QUANTITY,
    )

    model_config = ConfigDict(
        extra="forbid"
    )

class CreateOrderRequest(BaseModel):
    items: list[CreateOrderItemRequest] = Field(
        min_length=1,
        max_length=MAX_DISTINCT_ORDER_ITEMS,
    )

    model_config = ConfigDict(
        extra="forbid"
    )

class OrderItemResponse(BaseModel):
    menu_item_id: str

    name: str

    category: str

    # Stored in paise internally.
    # This response keeps the backend representation
    # explicit for future order processing.
    unit_price_paise: int = Field(ge=0)

    quantity: int = Field(
        ge=1,
        le=MAX_ORDER_ITEM_QUANTITY,
    )

    line_total_paise: int = Field(ge=0)


class OrderResponse(BaseModel):
    id: str
    table_id: str
    table_number: int = Field(ge=1)
    items: list[OrderItemResponse] = Field(min_length=1)
    total_paise: int = Field(ge=0)
    status: OrderStatus
    payment_status: Optional[str] = "unpaid"
    payment_method: Optional[str] = None
    created_at: datetime
    paid_at: Optional[datetime] = None
    confirmed_at: Optional[datetime] = None
    preparing_at: Optional[datetime] = None
    ready_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    invoice_number: Optional[str] = None

    model_config = ConfigDict(extra="ignore")


# =========================================================
# HEALTH
# =========================================================

class HealthResponse(BaseModel):
    status: str
    database: str

    model_config = ConfigDict(extra="forbid")