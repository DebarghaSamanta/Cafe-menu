from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.models import OrderStatus


# =========================================================
# REQUEST SCHEMAS
# =========================================================

class OrderStatusUpdate(BaseModel):
    """
    Payload for updating an order's status.
    """
    status: OrderStatus

    model_config = ConfigDict(extra="forbid")


# =========================================================
# RESPONSE SCHEMAS
# =========================================================

class AdminOrderItemResponse(BaseModel):
    menu_item_id: str
    name: str
    category: str
    unit_price_paise: int = Field(ge=0)
    quantity: int = Field(ge=1)
    line_total_paise: int = Field(ge=0)


class AdminOrderResponse(BaseModel):
    id: str
    table_id: str
    table_number: int = Field(ge=1)
    items: List[AdminOrderItemResponse]
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
    cancel_reason: Optional[str] = None
    invoice_number: Optional[str] = None

    model_config = ConfigDict(extra="ignore")


class AdminOrderListResponse(BaseModel):
    orders: List[AdminOrderResponse]
    total: int

    model_config = ConfigDict(extra="forbid")
