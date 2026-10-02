from typing import Optional

from fastapi import APIRouter, Depends, Query, Request

from app.schemas.order_admin import (
    AdminOrderListResponse,
    AdminOrderResponse,
    OrderStatusUpdate,
)
from app.schemas.invoice import InvoiceResponse
from app.security import require_admin
from app.services.order_admin_service import (
    get_order,
    list_orders,
    update_order_status,
)
from app.services.invoice_service import get_invoice


router = APIRouter(
    prefix="/orders",
    tags=["Admin Orders"],
)


@router.get(
    "",
    response_model=AdminOrderListResponse,
    dependencies=[Depends(require_admin)],
)
def list_all_orders(
    request: Request,
    status: Optional[str] = Query(
        default=None,
        description=(
            "Filter by order status: "
            "pending, confirmed, preparing, ready, "
            "completed, cancelled"
        ),
    ),
    table_number: Optional[int] = Query(
        default=None,
        ge=1,
        description="Filter by table number",
    ),
    start_date: Optional[str] = Query(
        default=None,
        regex=r"^\d{4}-\d{2}-\d{2}$",
        description="Filter start date (YYYY-MM-DD)",
    ),
    end_date: Optional[str] = Query(
        default=None,
        regex=r"^\d{4}-\d{2}-\d{2}$",
        description="Filter end date (YYYY-MM-DD)",
    ),
    limit: int = Query(
        default=50,
        ge=1,
        le=200,
        description="Max orders to return",
    ),
    skip: int = Query(
        default=0,
        ge=0,
        description="Number of orders to skip (pagination)",
    ),
):
    """
    List all orders with optional status / table / date filters.
    Results are sorted by most recent first.
    """

    return list_orders(
        request.app.state.db,
        status_filter=status,
        table_number=table_number,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
        skip=skip,
    )


@router.get(
    "/{order_id}",
    response_model=AdminOrderResponse,
    dependencies=[Depends(require_admin)],
)
def get_one_order(
    order_id: str,
    request: Request,
):
    """
    Get a single order by its ID.
    """

    return get_order(
        request.app.state.db,
        order_id,
    )


@router.patch(
    "/{order_id}/status",
    response_model=AdminOrderResponse,
    dependencies=[Depends(require_admin)],
)
def patch_order_status(
    order_id: str,
    payload: OrderStatusUpdate,
    request: Request,
):
    """
    Update an order's status.

    Valid transitions:
    - pending → confirmed or cancelled
    - confirmed → preparing or cancelled
    - preparing → ready or cancelled
    - ready → completed or cancelled
    - completed / cancelled → (terminal, no further changes)
    """

    return update_order_status(
        request.app.state.db,
        order_id,
        payload,
    )


@router.get(
    "/{order_id}/invoice",
    response_model=InvoiceResponse,
    dependencies=[Depends(require_admin)],
)
def get_order_invoice(
    order_id: str,
    request: Request,
):
    """
    Get the official authoritative invoice for an order.
    Calculated and verified from backend database records.
    """
    return get_invoice(
        request.app.state.db,
        order_id,
    )


class SettlePaymentRequest(OrderStatusUpdate.__base__):
    payment_method: str = "cash"


@router.post(
    "/{order_id}/settle-payment",
    response_model=AdminOrderResponse,
    dependencies=[Depends(require_admin)],
)
def admin_settle_order_payment(
    order_id: str,
    payload: SettlePaymentRequest,
    request: Request,
):
    """
    Admin settles cash/card/UPI payment for an order.
    Marks payment_status = PAID, sets paid_at = now, advances pending order to confirmed for kitchen,
    and generates the official invoice immediately.
    """
    from datetime import datetime, timezone
    from fastapi import HTTPException
    from app.services.invoice_service import create_or_update_invoice

    db = request.app.state.db
    doc = db.orders.find_one({"_id": order_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Order not found")

    if doc.get("status") == "cancelled":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot settle payment for an already cancelled order."
        )

    now = datetime.now(timezone.utc)
    method = payload.payment_method or "cash"
    update_fields = {
        "payment_status": "PAID",
        "payment_method": method,
        "paid_at": now,
        "updated_at": now,
    }

    if doc.get("status") == "pending":
        update_fields["status"] = "confirmed"
        update_fields["confirmed_at"] = now

    db.orders.update_one({"_id": order_id}, {"$set": update_fields})
    create_or_update_invoice(db, order_id, payment_method=method)

    return get_order(db, order_id)
