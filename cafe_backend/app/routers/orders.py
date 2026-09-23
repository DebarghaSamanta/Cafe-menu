from datetime import datetime, timezone
from uuid import uuid4

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
    # 5. Re-check availability
    # =====================================================

    unavailable_items = []

    for item_id in menu_item_ids:
        document = menu_by_id[item_id]

        if not document.get(
            "is_available",
            False,
        ):
            unavailable_items.append(
                {
                    "menu_item_id": item_id,
                    "name": document.get(
                        "name",
                        "Unknown item",
                    ),
                }
            )

    if unavailable_items:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": (
                    "One or more selected items "
                    "are currently unavailable"
                ),
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

    order_document = {
        "_id": order_id,

        "table_id": table_id,
        "table_number": table_number,

        "items": order_items,

        "total_paise": total_paise,

        "status": "pending",

        "created_at": datetime.now(
            timezone.utc
        ),
    }

    # =====================================================
    # 8. Save order
    # =====================================================

    try:
        db.orders.insert_one(
            order_document
        )

    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to save the order",
        )

    # =====================================================
    # 9. Return server-created order
    # =====================================================

    return OrderResponse(
        id=order_id,
        table_id=table_id,
        table_number=table_number,
        items=order_items,
        total_paise=total_paise,
        status="pending",
        created_at=order_document[
            "created_at"
        ],
    )


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

    # =====================================================
    # 1. Resolve current table
    # =====================================================

    table = resolve_table_from_token(
        db,
        x_table_token,
    )

    current_table_id = str(
        table["_id"]
    )

    # =====================================================
    # 2. Fetch order
    # =====================================================

    order = db.orders.find_one(
        {
            "_id": order_id
        }
    )

    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )

    # =====================================================
    # 3. Strict table isolation
    # =====================================================

    order_table_id = str(
        order["table_id"]
    )

    if order_table_id != current_table_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "You are not authorized to access "
                "this order"
            ),
        )

    # =====================================================
    # 4. Return order
    # =====================================================

    return OrderResponse(
        id=str(order["_id"]),
        table_id=order["table_id"],
        table_number=order["table_number"],
        items=order["items"],
        total_paise=order["total_paise"],
        status=order["status"],
        created_at=order["created_at"],
    )