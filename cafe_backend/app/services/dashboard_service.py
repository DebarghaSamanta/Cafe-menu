from collections import defaultdict
from datetime import datetime, timezone

from app.schemas.dashboard import (
    DashboardStats,
    OrderStatusCount,
    TopMenuItem,
)


def get_dashboard_stats(
    db,
    start_date: str | None = None,
    end_date: str | None = None,
) -> DashboardStats:
    """
    Compute sales and order statistics for the admin dashboard with optional date range filter.
    """
    # -------------------------------------------------
    # Parse date range boundaries (UTC)
    # -------------------------------------------------
    start_dt = None
    end_dt = None

    if start_date:
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d").replace(
                hour=0, minute=0, second=0, microsecond=0, tzinfo=timezone.utc
            )
        except ValueError:
            pass

    if end_date:
        try:
            end_dt = datetime.strptime(end_date, "%Y-%m-%d").replace(
                hour=23, minute=59, second=59, microsecond=999999, tzinfo=timezone.utc
            )
        except ValueError:
            pass

    query = {}
    if start_dt or end_dt:
        date_query = {}
        if start_dt:
            date_query["$gte"] = start_dt.replace(tzinfo=None)
        if end_dt:
            date_query["$lte"] = end_dt.replace(tzinfo=None)
        query["created_at"] = date_query

    all_orders = list(db.orders.find(
        query,
        {
            "_id": 1,
            "status": 1,
            "total_paise": 1,
            "items": 1,
            "created_at": 1,
        }
    ))

    # -------------------------------------------------
    # Today's date boundaries (UTC)
    # -------------------------------------------------
    now = datetime.now(timezone.utc)
    today_start = now.replace(
        hour=0, minute=0, second=0, microsecond=0
    )

    # -------------------------------------------------
    # Aggregate
    # -------------------------------------------------
    total_orders = len(all_orders)
    total_revenue_paise = 0
    today_orders = 0
    today_revenue_paise = 0
    status_counts: dict[str, int] = defaultdict(int)
    item_totals: dict[str, dict] = {}

    def _is_today(dt: datetime | None) -> bool:
        if not dt:
            return False
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt >= today_start

    for order in all_orders:
        order_status = order.get("status", "unknown")
        status_counts[order_status] += 1

        # Only count revenue from completed orders (payment received)
        if order_status == "completed":
            paise = order.get("total_paise", 0)
            total_revenue_paise += paise

            created_at = order.get("created_at")
            if _is_today(created_at):
                today_orders += 1
                today_revenue_paise += paise

        # Track item popularity from ALL non-cancelled orders
        if order_status not in ("cancelled",):
            for item in order.get("items", []):
                mid = item.get("menu_item_id", "")
                if mid not in item_totals:
                    item_totals[mid] = {
                        "menu_item_id": mid,
                        "name": item.get("name", ""),
                        "total_quantity": 0,
                        "total_revenue_paise": 0,
                    }
                item_totals[mid]["total_quantity"] += item.get("quantity", 0)
                item_totals[mid]["total_revenue_paise"] += item.get(
                    "line_total_paise", 0
                )

    # -------------------------------------------------
    # Today order count (all statuses, not just completed)
    # -------------------------------------------------
    today_orders_count = sum(
        1 for o in all_orders
        if _is_today(o.get("created_at"))
    )

    # -------------------------------------------------
    # Top 10 items by quantity sold
    # -------------------------------------------------
    top_items = sorted(
        item_totals.values(),
        key=lambda x: x["total_quantity"],
        reverse=True,
    )[:10]

    # -------------------------------------------------
    # Average order value (completed orders only)
    # -------------------------------------------------
    completed_count = status_counts.get("completed", 0)
    avg_order_value = (
        total_revenue_paise // completed_count
        if completed_count > 0
        else 0
    )

    return DashboardStats(
        total_orders=total_orders,
        total_revenue_paise=total_revenue_paise,
        today_orders=today_orders_count,
        today_revenue_paise=today_revenue_paise,
        orders_by_status=[
            OrderStatusCount(status=s, count=c)
            for s, c in sorted(status_counts.items())
        ],
        top_items=[
            TopMenuItem(**item) for item in top_items
        ],
        average_order_value_paise=avg_order_value,
        filter_start_date=start_date,
        filter_end_date=end_date,
    )
