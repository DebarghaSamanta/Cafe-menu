from datetime import datetime, timezone

from bson import ObjectId
from fastapi import HTTPException, status

from app.schemas.staff_schemas import (
    MenuAvailabilityUpdate,
    StaffOrderStatusUpdate,
    StaffPasswordUpdate,
    StaffProfileResponse,
)
from app.security import hash_password, verify_password


# =========================================================
# STAFF-ALLOWED ORDER STATUS TRANSITIONS
#
# Staff can only move orders through the kitchen flow.
# Admin handles: ready → completed (payment done) and cancellation.
# =========================================================

STAFF_ALLOWED_TRANSITIONS: dict[str, set[str]] = {
    "pending":   {"confirmed"},
    "confirmed": {"preparing"},
    "preparing": {"ready"},
    "ready":     set(),       # staff stops here; admin marks completed
    "completed": set(),
    "cancelled": set(),
}


def _id_query(id_str: str) -> dict:
    if ObjectId.is_valid(id_str):
        return {"$or": [{"_id": ObjectId(id_str)}, {"_id": id_str}]}
    return {"_id": id_str}


def get_staff_profile(db, user_id: str) -> StaffProfileResponse:
    """
    Return the authenticated staff member's own profile.
    """
    doc = db.users.find_one(_id_query(user_id))

    if doc is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return StaffProfileResponse(
        id=str(doc["_id"]),
        username=doc["username"],
        display_name=doc.get("display_name"),
        role=doc["role"],
        is_active=doc.get("is_active", True),
    )


def update_own_profile(
    db,
    user_id: str,
    payload: StaffPasswordUpdate,
) -> StaffProfileResponse:
    """
    Staff updates their own display_name and/or password.
    Current password must be verified before allowing the change.
    """
    query = _id_query(user_id)
    doc = db.users.find_one(query)

    if doc is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Verify current password before making any changes
    if not verify_password(payload.current_password, doc["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect",
        )

    update_fields: dict = {
        "password_hash": hash_password(payload.new_password),
    }

    if payload.display_name is not None:
        update_fields["display_name"] = payload.display_name

    db.users.update_one(query, {"$set": update_fields})

    updated = db.users.find_one(query)

    return StaffProfileResponse(
        id=str(updated["_id"]),
        username=updated["username"],
        display_name=updated.get("display_name"),
        role=updated["role"],
        is_active=updated.get("is_active", True),
    )


def staff_list_orders(
    db,
    status_filter: str | None = None,
    table_number: int | None = None,
    limit: int = 50,
    skip: int = 0,
) -> dict:
    """
    Return orders visible to staff.
    Excludes completed/cancelled by default unless explicitly filtered.
    """
    query: dict = {}

    if status_filter:
        VALID_STATUSES = {
            "pending", "confirmed", "preparing",
            "ready", "completed", "cancelled",
        }
        if status_filter not in VALID_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status filter: {status_filter}",
            )
        query["status"] = status_filter
    else:
        # By default show active (non-terminal) orders
        query["status"] = {
            "$in": ["pending", "confirmed", "preparing", "ready"]
        }

    if table_number is not None:
        query["table_number"] = table_number

    total = db.orders.count_documents(query)

    cursor = (
        db.orders
        .find(query)
        .sort("created_at", 1)   # oldest first — kitchen processes in order
        .skip(skip)
        .limit(limit)
    )

    orders = []
    for doc in cursor:
        orders.append({
            "id": str(doc["_id"]),
            "table_id": str(doc["table_id"]),
            "table_number": doc["table_number"],
            "items": doc["items"],
            "total_paise": doc["total_paise"],
            "status": doc["status"],
            "created_at": doc["created_at"],
        })

    return {"orders": orders, "total": total}


def staff_get_order(db, order_id: str) -> dict:
    """
    Return a single order.
    """
    doc = db.orders.find_one({"_id": order_id})

    if doc is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )

    return {
        "id": str(doc["_id"]),
        "table_id": str(doc["table_id"]),
        "table_number": doc["table_number"],
        "items": doc["items"],
        "total_paise": doc["total_paise"],
        "status": doc["status"],
        "created_at": doc["created_at"],
    }


def staff_update_order_status(
    db,
    order_id: str,
    payload: StaffOrderStatusUpdate,
) -> dict:
    """
    Staff advances an order through the kitchen flow only.

    Allowed:
        pending   → confirmed
        confirmed → preparing
        preparing → ready

    NOT allowed for staff:
        ready → completed  (admin — payment received)
        any   → cancelled  (admin only)
    """
    STAFF_VALID_TARGETS = {"confirmed", "preparing", "ready"}

    new_status = payload.status

    if new_status not in STAFF_VALID_TARGETS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Staff cannot set status to '{new_status}'. "
                f"Allowed values: confirmed, preparing, ready"
            ),
        )

    doc = db.orders.find_one({"_id": order_id})

    if doc is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )

    current_status = doc["status"]

    if new_status == current_status:
        return staff_get_order(db, order_id)

    allowed_next = STAFF_ALLOWED_TRANSITIONS.get(current_status, set())

    if new_status not in allowed_next:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Cannot move order from '{current_status}' to '{new_status}'. "
                f"Allowed next: {sorted(allowed_next) or 'none (terminal state)'}"
            ),
        )

    # Staff cannot advance orders that have not been settled/paid
    if doc.get("payment_status") != "PAID":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order payment has not been settled yet. Only Admin can settle cash/card payments to confirm the order.",
        )

    now = datetime.now(timezone.utc)
    db.orders.update_one(
        {"_id": order_id},
        {
            "$set": {
                "status": new_status,
                "updated_at": now,
                f"{new_status}_at": now,
            }
        },
    )

    return staff_get_order(db, order_id)


def staff_list_menu(db) -> dict:
    """
    Return all menu items (read-only view for staff).
    """
    items = list(db.menu_items.find().sort([("category", 1), ("name", 1)]))

    for item in items:
        item["_id"] = str(item["_id"])

    return {"items": items, "total": len(items)}


def staff_toggle_availability(
    db,
    item_id: str,
    payload: MenuAvailabilityUpdate,
) -> dict:
    """
    Staff marks a menu item as available or unavailable (e.g. ran out of stock).
    """
    result = db.menu_items.update_one(
        {"_id": item_id},
        {"$set": {"is_available": payload.is_available}},
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Menu item not found",
        )

    item = db.menu_items.find_one({"_id": item_id})
    item["_id"] = str(item["_id"])

    return item


def staff_list_tables(db) -> dict:
    """
    Return all tables (read-only, staff needs table numbers for context).
    """
    tables = list(db.tables.find().sort("table_number", 1))

    result = []
    for t in tables:
        result.append({
            "id": str(t["_id"]),
            "table_number": t["table_number"],
            "is_active": t.get("is_active", True),
        })

    return {"tables": result, "total": len(result)}
