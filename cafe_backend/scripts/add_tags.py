"""
Add tags to specific, already-existing menu items without touching
anything else in the menu_items collection.

Usage (from cafe_backend/, venv active):
    python -m scripts.add_tags
"""

from app.db.mongodb import (
    create_mongo_client,
    ensure_database_structure,
    get_database,
)

# Only the _id's listed here are touched.
# Every other menu item in the collection is left completely alone.
TAGS = [
    {"_id": "menu-001", "tags": ["tea", "chai", "sweet"]},          # Masala Chai
    {"_id": "menu-002", "tags": ["coffee", "hot"]},                  # Cappuccino
    {"_id": "menu-003", "tags": ["coffee", "cold"]},                 # Cold Coffee
    {"_id": "menu-004", "tags": ["tea", "cold", "refreshing"]},      # Lemon Iced Tea
    {"_id": "menu-005", "tags": ["fries", "snack", "starter"]},      # French Fries
    {"_id": "menu-006", "tags": ["paneer", "vegetarian", "starter"]},  # Paneer Tikka
    {"_id": "menu-007", "tags": ["sandwich", "vegetarian"]},         # Veg Sandwich
    {"_id": "menu-008", "tags": ["paneer", "wrap", "vegetarian"]},   # Paneer Wrap
    {"_id": "menu-009", "tags": ["pasta", "spicy", "vegetarian"]},   # Penne Arrabbiata
    {"_id": "menu-010", "tags": ["sandwich", "chicken", "non-vegetarian"]},  # Chicken Club Sandwich
    # Add any remaining items (e.g. Cappuccino Special, Chocolate
    # Brownie) here once you confirm their real _id's, e.g.:
    # {"_id": "menu-0XX", "tags": ["coffee", "hot"]},
    # {"_id": "menu-0XX", "tags": ["dessert", "sweet", "chocolate"]},
]


def apply_tags(db) -> None:
    updated = 0
    missing = []

    for entry in TAGS:
        result = db.menu_items.update_one(
            {"_id": entry["_id"]},
            {"$set": {"tags": entry["tags"]}},
        )

        if result.matched_count == 0:
            missing.append(entry["_id"])
        else:
            updated += 1

    print(f"Updated {updated} menu item(s).")

    if missing:
        print(f"WARNING: these _id's were not found and were skipped: {missing}")


def main():
    client = create_mongo_client()
    try:
        client.admin.command("ping")
        db = get_database(client)
        ensure_database_structure(db)
        apply_tags(db)
    finally:
        client.close()


if __name__ == "__main__":
    main()