from datetime import datetime, timezone
from uuid import uuid4
from pydantic import BaseModel

from fastapi import (
    APIRouter,
    Header,
    HTTPException,
    Request,
    status,
)

from app.schemas.models import (
    CreateOrderRequest,
    OrderResponse,
)
from app.schemas.invoice import InvoiceResponse
from app.services.invoice_service import get_invoice
from app.services.table_resolution import (
    resolve_table_from_token,
)


router = APIRouter(
    prefix="/api/orders",
    tags=["Orders"],
)


def generate_order_id() -> str:
    """
    Generate a unique application-level order ID.
    """
    return f"order-{uuid4().hex}"


@router.post(
    "",
    response_model=OrderResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_order(
    payload: CreateOrderRequest,
    request: Request,
    x_table_token: str | None = Header(
        default=None,
        alias="X-Table-Token",
    ),
):
    """
    Create an order for the table associated with
    the supplied QR token.

    The client does NOT control:
    - table
    - name
    - category
    - price
    - line total
    - order total
    """

    db = request.app.state.db

    # =====================================================
    # 1. Resolve table from token
    # =====================================================

    table = resolve_table_from_token(
        db,
        x_table_token,
    )

    table_id = str(table["_id"])
    table_number = table["table_number"]

    # =====================================================
    # 2. Merge duplicate menu item IDs
    # =====================================================

    requested_quantities: dict[str, int] = {}

    for item in payload.items:
        current_quantity = (
            requested_quantities.get(
                item.menu_item_id,
                0,
            )
        )

        new_quantity = (
            current_quantity +
            item.quantity
        )

        if new_quantity > 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Maximum quantity for one menu "
                    f"item is 10: {item.menu_item_id}"
                ),
            )

        requested_quantities[
            item.menu_item_id
        ] = new_quantity

    if not requested_quantities:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order must contain at least one item",
        )

    # =====================================================
    # 3. Fetch latest menu data
    # =====================================================

    menu_item_ids = list(
        requested_quantities.keys()
    )

    menu_documents = list(
        db.menu_items.find(
            {
                "_id": {
                    "$in": menu_item_ids
                }
            },
            {
                "_id": 1,
                "name": 1,
                "category": 1,
                "price_paise": 1,
                "stock_quantity": 1,
                "is_available": 1,
            },
        )
    )

    menu_by_id = {
        str(document["_id"]): document
        for document in menu_documents
    }

    # =====================================================
    # 4. Check whether every requested item exists
    # =====================================================

    missing_items = [
        item_id
        for item_id in menu_item_ids
        if item_id not in menu_by_id
    ]

    if missing_items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "One or more menu items do not exist",
                "menu_item_ids": missing_items,
            },
        )

    # =====================================================
    # 5. Re-check availability & Stock Quantities
    # =====================================================

    unavailable_items = []

    for item_id in menu_item_ids:
        document = menu_by_id[item_id]
        req_qty = requested_quantities[item_id]
        stock_qty = document.get("stock_quantity", 50)
        is_avail = document.get("is_available", True) and (stock_qty > 0)

        if not is_avail:
            unavailable_items.append(
                {
                    "menu_item_id": item_id,
                    "name": document.get("name", "Unknown item"),
                    "reason": "Item is out of stock",
                }
            )
        elif req_qty > stock_qty:
            unavailable_items.append(
                {
                    "menu_item_id": item_id,
                    "name": document.get("name", "Unknown item"),
                    "reason": f"Only {stock_qty} remaining in stock (requested: {req_qty})",
                }
            )

    if unavailable_items:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": "One or more selected items cannot be fulfilled due to stock limits",
                "items": unavailable_items,
            },
        )

    # =====================================================
    # 6. Build server-side order snapshot
    # =====================================================

    order_items = []
    total_paise = 0

    for item_id in menu_item_ids:
        document = menu_by_id[item_id]

        quantity = requested_quantities[
            item_id
        ]

        price_paise = document.get(
            "price_paise"
        )

        # Defensive database validation.
        if (
            not isinstance(price_paise, int)
            or price_paise < 0
        ):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=(
                    f"Invalid price configuration "
                    f"for menu item {item_id}"
                ),
            )

        line_total_paise = (
            price_paise * quantity
        )

        order_items.append(
            {
                "menu_item_id": item_id,
                "name": document["name"],
                "category": document["category"],
                "unit_price_paise": price_paise,
                "quantity": quantity,
                "line_total_paise": line_total_paise,
            }
        )

        total_paise += line_total_paise

    # =====================================================
    # 7. Create order document
    # =====================================================

    order_id = generate_order_id()
    now = datetime.now(timezone.utc)
    order_document = {
        "_id": order_id,
        "table_id": table_id,
        "table_number": table_number,
        "items": order_items,
        "total_paise": total_paise,
        "status": "pending",
        "payment_status": "unpaid",
        "payment_method": None,
        "created_at": now,
        "paid_at": None,
        "confirmed_at": None,
        "preparing_at": None,
        "ready_at": None,
        "completed_at": None,
        "cancelled_at": None,
    }

    # =====================================================
    # 8. Save order & Atomically Decrement Stock
    # =====================================================

    try:
        db.orders.insert_one(order_document)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to save the order",
        )

    # Decrement stock count and auto-disable if 0
    for item_id, req_qty in requested_quantities.items():
        doc = menu_by_id[item_id]
        curr_stock = doc.get("stock_quantity", 50)
        new_stock = max(0, curr_stock - req_qty)
        db.menu_items.update_one(
            {"_id": item_id},
            {
                "$set": {
                    "stock_quantity": new_stock,
                    "is_available": new_stock > 0,
                }
            },
        )

    # =====================================================
    # 9. Return server-created order
    # =====================================================

    return _serialize_customer_order(order_document)


def _serialize_customer_order(order: dict) -> OrderResponse:
    return OrderResponse(
        id=str(order["_id"]),
        table_id=str(order["table_id"]),
        table_number=order["table_number"],
        items=order["items"],
        total_paise=order["total_paise"],
        status=order["status"],
        payment_status=order.get("payment_status", "paid" if order.get("status") == "completed" else "unpaid"),
        payment_method=order.get("payment_method"),
        created_at=order["created_at"],
        paid_at=order.get("paid_at"),
        confirmed_at=order.get("confirmed_at"),
        preparing_at=order.get("preparing_at"),
        ready_at=order.get("ready_at"),
        completed_at=order.get("completed_at"),
        cancelled_at=order.get("cancelled_at"),
        invoice_number=order.get("invoice_number"),
    )


class CustomerPaymentPayload(BaseModel):
    payment_method: str = "upi"  # "upi", "card", "cash", "cash_request"


@router.post(
    "/{order_id}/pay",
    response_model=OrderResponse,
)
def pay_customer_order(
    order_id: str,
    payload: CustomerPaymentPayload,
    request: Request,
    x_table_token: str | None = Header(
        default=None,
        alias="X-Table-Token",
    ),
):
    """
    Customer settles payment (pre-paid workflow).
    - Digital Payment (UPI / Card): Immediately marks order as PAID, confirms order for kitchen, and generates invoice.
    - Pay at Counter (Cash Request): Marks order for cash settlement at counter/table.
    """
    db = request.app.state.db

    order = db.orders.find_one({"_id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if x_table_token:
        table = resolve_table_from_token(db, x_table_token)
        if str(order["table_id"]) != str(table["_id"]):
            raise HTTPException(status_code=403, detail="Unauthorized table access")

    now = datetime.now(timezone.utc)
    method = payload.payment_method or "upi"

    if method == "cash_request":
        db.orders.update_one(
            {"_id": order_id},
            {
                "$set": {
                    "payment_method": "cash",
                    "payment_status": "cash_pending",
                    "updated_at": now,
                }
            },
        )
    else:
        db.orders.update_one(
            {"_id": order_id},
            {
                "$set": {
                    "payment_status": "PAID",
                    "payment_method": method,
                    "paid_at": now,
                    "status": "confirmed",
                    "confirmed_at": now,
                    "updated_at": now,
                }
            },
        )
        from app.services.invoice_service import create_or_update_invoice
        create_or_update_invoice(db, order_id, payment_method=method)

    updated = db.orders.find_one({"_id": order_id})
    return _serialize_customer_order(updated)


@router.get(
    "/table/active",
    response_model=list[OrderResponse],
)
def get_table_active_orders(
    request: Request,
    x_table_token: str | None = Header(
        default=None,
        alias="X-Table-Token",
    ),
):
    """
    Return only the current active order or the single latest completed order for this table.
    Old past orders from previous sessions are excluded.
    """
    db = request.app.state.db

    table = resolve_table_from_token(
        db,
        x_table_token,
    )

    table_id = str(table["_id"])

    # 1. Look for active in-flight orders for this table (latest 1)
    active_orders = list(
        db.orders.find({
            "table_id": table_id,
            "status": {"$in": ["pending", "confirmed", "preparing", "ready"]},
        })
        .sort("created_at", -1)
        .limit(1)
    )

    if active_orders:
        return [_serialize_customer_order(doc) for doc in active_orders]

    # 2. If no in-flight order, return only the single latest completed order within the last 2 hours
    latest_order = db.orders.find_one(
        {
            "table_id": table_id,
            "status": "completed",
        },
        sort=[("created_at", -1)],
    )

    if latest_order:
        now = datetime.now(timezone.utc)
        order_time = latest_order.get("completed_at") or latest_order.get("created_at")
        if order_time:
            if order_time.tzinfo is None:
                order_time = order_time.replace(tzinfo=timezone.utc)
            if (now - order_time).total_seconds() < 7200:
                return [_serialize_customer_order(latest_order)]

    return []


@router.get(
    "/{order_id}",
    response_model=OrderResponse,
)
def get_order(
    order_id: str,
    request: Request,
    x_table_token: str | None = Header(
        default=None,
        alias="X-Table-Token",
    ),
):
    """
    Return an order only if it belongs to the
    table associated with the supplied QR token.
    """
    db = request.app.state.db

    table = resolve_table_from_token(
        db,
        x_table_token,
    )

    current_table_id = str(table["_id"])

    order = db.orders.find_one({"_id": order_id})

    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )

    order_table_id = str(order["table_id"])

    if order_table_id != current_table_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to access this order",
        )

    return _serialize_customer_order(order)


@router.get(
    "/{order_id}/invoice",
    response_model=InvoiceResponse,
)
def get_order_public_invoice(
    order_id: str,
    request: Request,
):
    """
    Public / customer endpoint to fetch authoritative invoice data.
    """
    return get_invoice(
        request.app.state.db,
        order_id,
    )