"""
Seed sample orders for Table 7 and Table 8.

Run this AFTER scripts/seed.py (tables must exist) and AFTER your
menu_items collection has been populated (GET /api/menu must return
at least a couple of available items).

Usage (from cafe_backend/, with your venv active):
    python -m scripts.seed_orders
"""

from datetime import datetime, timezone
from uuid import uuid4

from app.db.mongodb import (
    create_mongo_client,
    ensure_database_structure,
    get_database,
)

# Table numbers we want sample orders for.
TARGET_TABLE_NUMBERS = [7, 8]

# How many orders to create per table.
ORDERS_PER_TABLE = 2

# Max distinct menu items per generated order.
ITEMS_PER_ORDER = 2

# Statuses to cycle through so you get variety while testing.
STATUS_CYCLE = ["pending", "preparing", "completed"]


def generate_order_id() -> str:
    return f"order-{uuid4().hex}"


def get_target_tables(db):
    tables = list(
        db.tables.find(
            {"table_number": {"$in": TARGET_TABLE_NUMBERS}},
            {"_id": 1, "table_number": 1, "is_active": 1},
        )
    )

    found_numbers = {t["table_number"] for t in tables}
    missing = set(TARGET_TABLE_NUMBERS) - found_numbers

    if missing:
        raise SystemExit(
            f"Table(s) {sorted(missing)} not found. "
            f"Run scripts/seed.py first to create them."
        )

    return tables


def get_sample_menu_items(db, limit: int = 6):
    items = list(
        db.menu_items.find(
            {"is_available": True},
            {"_id": 1, "name": 1, "category": 1, "price_paise": 1},
        ).limit(limit)
    )

    if len(items) < ITEMS_PER_ORDER:
        raise SystemExit(
            "Not enough available menu items in the database. "
            "Seed your menu_items collection first."
        )

    return items


def build_order_document(table: dict, menu_items: list[dict], status: str) -> dict:
    table_id = str(table["_id"])
    table_number = table["table_number"]

    chosen = menu_items[:ITEMS_PER_ORDER]

    order_items = []
    total_paise = 0

    for document in chosen:
        quantity = 2  # fixed sample quantity
        price_paise = document["price_paise"]
        line_total_paise = price_paise * quantity

        order_items.append(
            {
                "menu_item_id": str(document["_id"]),
                "name": document["name"],
                "category": document["category"],
                "unit_price_paise": price_paise,
                "quantity": quantity,
                "line_total_paise": line_total_paise,
            }
        )

        total_paise += line_total_paise

    return {
        "_id": generate_order_id(),
        "table_id": table_id,
        "table_number": table_number,
        "items": order_items,
        "total_paise": total_paise,
        "status": status,
        "created_at": datetime.now(timezone.utc),
    }


def main():
    client = create_mongo_client()

    try:
        client.admin.command("ping")

        db = get_database(client)
        ensure_database_structure(db)

        tables = get_target_tables(db)
        menu_items = get_sample_menu_items(db)

        created_ids = []

        for table in tables:
            for i in range(ORDERS_PER_TABLE):
                status = STATUS_CYCLE[i % len(STATUS_CYCLE)]

                # Rotate which menu items are used so orders differ a bit.
                rotated_items = menu_items[i:] + menu_items[:i]

                order_document = build_order_document(
                    table, rotated_items, status
                )

                db.orders.insert_one(order_document)
                created_ids.append(
                    (table["table_number"], order_document["_id"], status)
                )

        print()
        print("=" * 60)
        print("Seeded orders:")
        for table_number, order_id, status in created_ids:
            print(f"  Table {table_number}: {order_id}  [{status}]")
        print("=" * 60)
        print(f"Total orders created: {len(created_ids)}")

    finally:
        client.close()


if __name__ == "__main__":
    main()