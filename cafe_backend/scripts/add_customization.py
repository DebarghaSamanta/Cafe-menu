"""
Add customization_groups to specific, already-existing menu items
without touching anything else in the menu_items collection.

Usage (from cafe_backend/, venv active):
    python -m scripts.add_customizations
"""

from app.db.mongodb import (
    create_mongo_client,
    ensure_database_structure,
    get_database,
)

# Only the _id's listed here are touched.
# Every other menu item in the collection is left completely alone.
CUSTOMIZATIONS = [
    {
        "_id": "menu-001",  # Masala Chai
        "customization_groups": [
            {
                "id": "size",
                "label": "Size",
                "type": "single",
                "required": True,
                "choices": [
                    {
                        "id": "regular",
                        "label": "Regular",
                        "price_delta_paise": 0,
                    },
                    {
                        "id": "large",
                        "label": "Large",
                        "price_delta_paise": 2000,
                    },
                ],
            },
            {
                "id": "sugar",
                "label": "Sugar Level",
                "type": "single",
                "required": True,
                "choices": [
                    {
                        "id": "no_sugar",
                        "label": "No Sugar",
                        "price_delta_paise": 0,
                    },
                    {
                        "id": "less",
                        "label": "Less Sugar",
                        "price_delta_paise": 0,
                    },
                    {
                        "id": "regular_sugar",
                        "label": "Regular",
                        "price_delta_paise": 0,
                    },
                ],
            },
        ],
    },

    {
        "_id": "menu-002",  # Cappuccino
        "customization_groups": [
            {
                "id": "size",
                "label": "Size",
                "type": "single",
                "required": True,
                "choices": [
                    {
                        "id": "regular",
                        "label": "Regular",
                        "price_delta_paise": 0,
                    },
                    {
                        "id": "large",
                        "label": "Large",
                        "price_delta_paise": 2000,
                    },
                ],
            },
            {
                "id": "milk_type",
                "label": "Milk Type",
                "type": "single",
                "required": True,
                "choices": [
                    {
                        "id": "regular",
                        "label": "Regular Milk",
                        "price_delta_paise": 0,
                    },
                    {
                        "id": "oat",
                        "label": "Oat Milk",
                        "price_delta_paise": 3000,
                    },
                    {
                        "id": "soy",
                        "label": "Soy Milk",
                        "price_delta_paise": 2000,
                    },
                    {
                        "id": "almond",
                        "label": "Almond Milk",
                        "price_delta_paise": 3000,
                    },
                ],
            },
        ],
    },

    {
        "_id": "menu-003",  # Cold Coffee
        "customization_groups": [
            {
                "id": "milk_type",
                "label": "Milk Type",
                "type": "single",
                "required": True,
                "choices": [
                    {
                        "id": "regular",
                        "label": "Regular Milk",
                        "price_delta_paise": 0,
                    },
                    {
                        "id": "oat",
                        "label": "Oat Milk",
                        "price_delta_paise": 3000,
                    },
                    {
                        "id": "soy",
                        "label": "Soy Milk",
                        "price_delta_paise": 2000,
                    },
                    {
                        "id": "almond",
                        "label": "Almond Milk",
                        "price_delta_paise": 3000,
                    },
                ],
            },
        ],
    },

    {
        "_id": "menu-004",  # Lemon Iced Tea
        "customization_groups": [
            {
                "id": "sweetness",
                "label": "Sweetness",
                "type": "single",
                "required": True,
                "choices": [
                    {
                        "id": "no_sugar",
                        "label": "No Sugar",
                        "price_delta_paise": 0,
                    },
                    {
                        "id": "less",
                        "label": "Less Sweet",
                        "price_delta_paise": 0,
                    },
                    {
                        "id": "regular",
                        "label": "Regular",
                        "price_delta_paise": 0,
                    },
                    {
                        "id": "extra",
                        "label": "Extra Sweet",
                        "price_delta_paise": 0,
                    },
                ],
            },
            {
                "id": "ice",
                "label": "Ice Level",
                "type": "single",
                "required": True,
                "choices": [
                    {
                        "id": "less_ice",
                        "label": "Less Ice",
                        "price_delta_paise": 0,
                    },
                    {
                        "id": "regular_ice",
                        "label": "Regular Ice",
                        "price_delta_paise": 0,
                    },
                    {
                        "id": "extra_ice",
                        "label": "Extra Ice",
                        "price_delta_paise": 0,
                    },
                ],
            },
        ],
    },
]


def apply_customizations(db) -> None:
    updated = 0
    missing = []

    for entry in CUSTOMIZATIONS:
        result = db.menu_items.update_one(
            {"_id": entry["_id"]},
            {
                "$set": {
                    "customization_groups": entry["customization_groups"]
                }
            },
        )

        if result.matched_count == 0:
            missing.append(entry["_id"])
        else:
            updated += 1

    print(f"Updated {updated} menu item(s).")

    if missing:
        print(
            f"WARNING: these _id's were not found and were skipped: {missing}"
        )


def main():
    client = create_mongo_client()

    try:
        client.admin.command("ping")
        db = get_database(client)
        ensure_database_structure(db)
        apply_customizations(db)
    finally:
        client.close()


if __name__ == "__main__":
    main()