from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query, Request

from app.schemas.dashboard import DashboardStats, PaymentComplete
from app.schemas.order_admin import AdminOrderResponse
from app.security import require_admin
from app.services.dashboard_service import get_dashboard_stats
from app.services.order_admin_service import get_order
from app.services.invoice_service import create_or_update_invoice


router = APIRouter(
    prefix="/dashboard",
    tags=["Admin Dashboard"],
)


@router.get(
    "",
    response_model=DashboardStats,
    dependencies=[Depends(require_admin)],
)
def get_stats(
    request: Request,
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
):
    """
    Admin dashboard — sales and order statistics with optional date filtering.

    Returns:
    - Total orders & revenue (completed orders only in selected period)
    - Today's orders & revenue
    - Orders broken down by status
    - Top 10 selling menu items
    - Average order value
    """
    return get_dashboard_stats(
        request.app.state.db,
        start_date=start_date,
        end_date=end_date,
    )


@router.post(
    "/orders/{order_id}/complete",
    response_model=AdminOrderResponse,
    dependencies=[Depends(require_admin)],
)
def mark_order_completed(
    order_id: str,
    payload: PaymentComplete,
    request: Request,
):
    """
    Admin marks an order as COMPLETED after payment is received.

    This is the final step in the order lifecycle:
        ready → completed

    Optionally record the payment method (cash / card / upi / etc.)
    """
    db = request.app.state.db

    doc = db.orders.find_one({"_id": order_id})

    if doc is None:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )

    if doc["status"] != "ready":
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Order must be in 'ready' state to mark as completed. "
                f"Current status: '{doc['status']}'"
            ),
        )

    update_data = {
        "status": "completed",
        "completed_at": datetime.now(timezone.utc),
    }

    if payload.payment_method:
        update_data["payment_method"] = payload.payment_method

    db.orders.update_one(
        {"_id": order_id},
        {"$set": update_data},
    )

    # Generate authoritative backend invoice immediately
    create_or_update_invoice(
        db,
        order_id,
        payment_method=payload.payment_method or "cash",
    )

    return get_order(db, order_id)


@router.post(
    "/orders/{order_id}/cancel",
    response_model=AdminOrderResponse,
    dependencies=[Depends(require_admin)],
)
def cancel_order(
    order_id: str,
    request: Request,
    reason: Optional[str] = Query(
        default=None,
        max_length=200,
        description="Optional reason for cancellation",
    ),
):
    """
    Admin cancels an order from any non-terminal state.

    Cannot cancel orders that are already completed or cancelled.
    """
    from fastapi import HTTPException, status as http_status

    db = request.app.state.db

    doc = db.orders.find_one({"_id": order_id})

    if doc is None:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )

    if doc["status"] in ("completed", "cancelled"):
        raise HTTPException(
            status_code=http_status.HTTP_409_CONFLICT,
            detail=(
                f"Cannot cancel an order that is already '{doc['status']}'"
            ),
        )

    update_data = {
        "status": "cancelled",
        "cancelled_at": datetime.now(timezone.utc),
    }

    if reason:
        update_data["cancellation_reason"] = reason

    db.orders.update_one(
        {"_id": order_id},
        {"$set": update_data},
    )

    return get_order(db, order_id)
