from typing import Optional

from fastapi import APIRouter, Depends, Query, Request, status

from app.schemas.staff_schemas import (
    MenuAvailabilityUpdate,
    StaffOrderStatusUpdate,
    StaffPasswordUpdate,
    StaffProfileResponse,
)
from app.security import require_staff, require_staff_or_admin, get_current_user
from app.services.staff_service import (
    get_staff_profile,
    staff_get_order,
    staff_list_menu,
    staff_list_orders,
    staff_list_tables,
    staff_toggle_availability,
    staff_update_order_status,
    update_own_profile,
)


router = APIRouter(
    prefix="/api/staff",
    tags=["Staff"],
    dependencies=[Depends(require_staff_or_admin)],
)


# =========================================================
# PROFILE
# =========================================================

@router.get(
    "/me",
    response_model=StaffProfileResponse,
    dependencies=[Depends(require_staff)],
)
def get_my_profile(
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    """
    Get your own staff profile.
    """
    return get_staff_profile(
        request.app.state.db,
        current_user["id"],
    )


@router.patch(
    "/me",
    response_model=StaffProfileResponse,
    dependencies=[Depends(require_staff)],
)
def update_my_profile(
    payload: StaffPasswordUpdate,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    """
    Update your own display name and/or password.
    You must provide your current password to make any changes.
    """
    return update_own_profile(
        request.app.state.db,
        current_user["id"],
        payload,
    )


# =========================================================
# ORDERS — Kitchen Queue
# =========================================================

@router.get("/orders")
def list_orders(
    request: Request,
    status: Optional[str] = Query(
        default=None,
        description=(
            "Filter by status. "
            "Default shows only active orders: pending, confirmed, preparing, ready. "
            "Pass a specific value to override."
        ),
    ),
    table_number: Optional[int] = Query(
        default=None,
        ge=1,
        description="Filter by table number",
    ),
    limit: int = Query(default=50, ge=1, le=200),
    skip: int = Query(default=0, ge=0),
):
    """
    View the order queue. Sorted oldest-first (FIFO kitchen order).

    By default shows only active orders (pending/confirmed/preparing/ready).
    Pass ?status=completed or ?status=cancelled to see those.
    """
    return staff_list_orders(
        request.app.state.db,
        status_filter=status,
        table_number=table_number,
        limit=limit,
        skip=skip,
    )


@router.get("/orders/{order_id}")
def get_order(order_id: str, request: Request):
    """
    Get details of a specific order.
    """
    return staff_get_order(
        request.app.state.db,
        order_id,
    )


@router.patch("/orders/{order_id}/status")
def update_order_status(
    order_id: str,
    payload: StaffOrderStatusUpdate,
    request: Request,
):
    """
    Advance an order through the kitchen workflow.

    Allowed transitions (staff only):
    - pending   → confirmed  (order acknowledged)
    - confirmed → preparing  (cooking started)
    - preparing → ready      (ready to serve)

    ❌ Staff CANNOT:
    - Mark as completed (admin does this when payment is received)
    - Cancel an order (admin only)
    """
    return staff_update_order_status(
        request.app.state.db,
        order_id,
        payload,
    )


# =========================================================
# MENU — Read-only + Availability Toggle
# =========================================================

@router.get("/menu")
def list_menu(request: Request):
    """
    View all menu items (read-only for staff).
    """
    return staff_list_menu(request.app.state.db)


@router.patch("/menu/{item_id}/availability")
def toggle_menu_availability(
    item_id: str,
    payload: MenuAvailabilityUpdate,
    request: Request,
):
    """
    Mark a menu item as available or unavailable.
    Use this when an item runs out of stock.

    Example: { "is_available": false }
    """
    return staff_toggle_availability(
        request.app.state.db,
        item_id,
        payload,
    )


# =========================================================
# TABLES — Read-only
# =========================================================

@router.get("/tables")
def list_tables(request: Request):
    """
    View all tables and their active status (read-only).
    """
    return staff_list_tables(request.app.state.db)
