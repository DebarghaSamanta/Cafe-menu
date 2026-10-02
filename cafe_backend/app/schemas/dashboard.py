from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class OrderStatusCount(BaseModel):
    status: str
    count: int


class TopMenuItem(BaseModel):
    menu_item_id: str
    name: str
    total_quantity: int
    total_revenue_paise: int


class DashboardStats(BaseModel):
    # Totals
    total_orders: int
    total_revenue_paise: int

    # Today
    today_orders: int
    today_revenue_paise: int

    # By status
    orders_by_status: List[OrderStatusCount]

    # Top selling items (by quantity)
    top_items: List[TopMenuItem]

    # Averages
    average_order_value_paise: int

    # Applied filters (if any)
    filter_start_date: Optional[str] = None
    filter_end_date: Optional[str] = None

    model_config = ConfigDict(extra="forbid")


class PaymentComplete(BaseModel):
    """
    Admin marks an order as completed (payment received).
    Optionally record payment method.
    """
    payment_method: Optional[str] = None   # cash | card | upi | etc.

    model_config = ConfigDict(extra="forbid")
