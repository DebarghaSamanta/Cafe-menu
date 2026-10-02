from datetime import datetime, timezone, timedelta
from typing import Optional

from bson import ObjectId
from fastapi import HTTPException, status

from app.schemas.order_admin import (
    AdminOrderItemResponse,
    AdminOrderListResponse,
    AdminOrderResponse,
    OrderStatusUpdate,
)
from app.schemas.models import OrderStatus


def _serialize_order(order: dict) -> AdminOrderResponse:
    """
    Convert a raw MongoDB order document into an AdminOrderResponse.
    """
    items = [
        AdminOrderItemResponse(**item)
        for item in order.get("items", [])
    ]

    return AdminOrderResponse(
        id=str(order["_id"]),
        table_id=str(order["table_id"]),
        table_number=order["table_number"],
        items=items,
        total_paise=order["total_paise"],
        status=order["status"],
        payment_status=order.get("payment_status", "paid" if order["status"] == "completed" else "unpaid"),
        payment_method=order.get("payment_method"),
        created_at=order["created_at"],
        paid_at=order.get("paid_at"),
        confirmed_at=order.get("confirmed_at"),
        preparing_at=order.get("preparing_at"),
        ready_at=order.get("ready_at"),
        completed_at=order.get("completed_at"),
        cancelled_at=order.get("cancelled_at"),
        cancel_reason=order.get("cancel_reason"),
        invoice_number=order.get("invoice_number"),
    )


def auto_cancel_unpaid_pending_orders(db, timeout_minutes: int = 30) -> int:
    """
    Find all orders that are still in 'pending' status with 'unpaid' payment status
    and were created more than `timeout_minutes` ago.
    Automatically transition them to 'cancelled' and restore the stock quantity to menu items.
    """
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(minutes=timeout_minutes)

    expired_orders = list(
        db.orders.find({
            "status": "pending",
            "payment_status": {"$in": ["unpaid", None]},
            "created_at": {"$lt": cutoff},
        })
    )

    if not expired_orders:
        return 0

    cancelled_count = 0
    for order in expired_orders:
        order_id = order["_id"]

        # Restore inventory stock for each item in the cancelled order
        items = order.get("items", [])
        for item in items:
            menu_item_id = item.get("menu_item_id")
            quantity = item.get("quantity", 1)
            if menu_item_id and quantity > 0:
                db.menu_items.update_one(
                    {"_id": menu_item_id},
                    {
                        "$inc": {"stock_quantity": quantity},
                        "$set": {"is_available": True},
                    },
                )

        # Mark order as auto-cancelled
        db.orders.update_one(
            {"_id": order_id},
            {
                "$set": {
                    "status": "cancelled",
                    "cancelled_at": now,
                    "cancel_reason": f"Auto-cancelled: Payment timeout after {timeout_minutes} minutes",
                    "updated_at": now,
                }
            },
        )
        cancelled_count += 1

    return cancelled_count


def list_orders(
    db,
    status_filter: Optional[str] = None,
    table_number: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 50,
    skip: int = 0,
) -> AdminOrderListResponse:
    """
    Return a paginated list of orders with optional filters.
    Performs real-time cleanup of expired unpaid pending orders before fetching.
    """
    # Clean up any pending unpaid orders older than 30 minutes
    auto_cancel_unpaid_pending_orders(db, timeout_minutes=30)

    query: dict = {}

    if status_filter:
        # Validate against known statuses
        valid = {s.value for s in OrderStatus}
        if status_filter not in valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Invalid status '{status_filter}'. "
                    f"Valid values: {sorted(valid)}"
                ),
            )
        query["status"] = status_filter

    if table_number is not None:
        query["table_number"] = table_number

    if start_date or end_date:
        date_query = {}
        if start_date:
            try:
                s_dt = datetime.strptime(start_date, "%Y-%m-%d").replace(
                    hour=0, minute=0, second=0, microsecond=0
                )
                date_query["$gte"] = s_dt
            except ValueError:
                pass
        if end_date:
            try:
                e_dt = datetime.strptime(end_date, "%Y-%m-%d").replace(
                    hour=23, minute=59, second=59, microsecond=999999
                )
                date_query["$lte"] = e_dt
            except ValueError:
                pass
        if date_query:
            query["created_at"] = date_query

    total = db.orders.count_documents(query)

    cursor = (
        db.orders
        .find(query)
        .sort("created_at", -1)
        .skip(skip)
        .limit(limit)
    )

    orders = [_serialize_order(doc) for doc in cursor]

    return AdminOrderListResponse(
        orders=orders,
        total=total,
    )


def get_order(db, order_id: str) -> AdminOrderResponse:
    """
    Return a single order by its ID.
    """
    doc = db.orders.find_one({"_id": order_id})

    if doc is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )

    return _serialize_order(doc)


def update_order_status(
    db,
    order_id: str,
    payload: OrderStatusUpdate,
) -> AdminOrderResponse:
    """
    Update the status of an existing order.

    Enforces a valid forward-only status transition:
        pending → confirmed → preparing → ready → completed
        any → cancelled
    """

    # Allowed transitions
    TRANSITIONS: dict[str, set[str]] = {
        OrderStatus.PENDING:   {OrderStatus.CONFIRMED, OrderStatus.CANCELLED},
        OrderStatus.CONFIRMED: {OrderStatus.PREPARING, OrderStatus.CANCELLED},
        OrderStatus.PREPARING: {OrderStatus.READY,     OrderStatus.CANCELLED},
        OrderStatus.READY:     {OrderStatus.COMPLETED, OrderStatus.CANCELLED},
        OrderStatus.COMPLETED: set(),
        OrderStatus.CANCELLED: set(),
    }

    doc = db.orders.find_one({"_id": order_id})

    if doc is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )

    current_status = OrderStatus(doc["status"])
    new_status = payload.status

    if new_status == current_status:
        # Idempotent — no-op is fine
        return _serialize_order(doc)

    allowed = TRANSITIONS.get(current_status, set())

    if new_status not in allowed:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Cannot transition order from "
                f"'{current_status.value}' to '{new_status.value}'. "
                f"Allowed next states: "
                f"{sorted(s.value for s in allowed) or 'none'}"
            ),
        )

    # Enforce prepaid requirement: order cannot advance unless payment is settled
    if new_status != OrderStatus.CANCELLED and doc.get("payment_status") != "PAID":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order cannot proceed without payment settlement. Please settle the cash/card bill payment first.",
        )

    now = datetime.now(timezone.utc)
    set_fields = {
        "status": new_status.value,
        "updated_at": now,
        f"{new_status.value}_at": now,
    }

    if new_status == OrderStatus.COMPLETED:
        set_fields["payment_status"] = "PAID"

    # If cancelling, replenish the stock back to menu inventory
    if new_status == OrderStatus.CANCELLED and current_status != OrderStatus.COMPLETED:
        items = doc.get("items", [])
        for item in items:
            menu_item_id = item.get("menu_item_id")
            quantity = item.get("quantity", 1)
            if menu_item_id and quantity > 0:
                db.menu_items.update_one(
                    {"_id": menu_item_id},
                    {
                        "$inc": {"stock_quantity": quantity},
                        "$set": {"is_available": True},
                    },
                )

    db.orders.update_one(
        {"_id": order_id},
        {"$set": set_fields},
    )

    if new_status == OrderStatus.COMPLETED:
        from app.services.invoice_service import create_or_update_invoice
        create_or_update_invoice(db, order_id)

    updated = db.orders.find_one({"_id": order_id})

    return _serialize_order(updated)
