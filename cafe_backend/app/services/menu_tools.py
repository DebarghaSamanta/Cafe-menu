def search_menu(
    db,
    category: str | None = None,
    tags: list[str] | None = None,
    max_price_paise: int | None = None,
    min_price_paise: int | None = None,
    limit: int = 6,
) -> dict:
    """
    Search available menu items. Read-only - never modifies the database.
    """
    query: dict = {"is_available": True}

    if category:
        query["category_key"] = category.lower().strip()

    if tags:
        query["tags"] = {"$in": [t.lower().strip() for t in tags]}

    price_filter: dict = {}
    if min_price_paise is not None:
        price_filter["$gte"] = min_price_paise
    if max_price_paise is not None:
        price_filter["$lte"] = max_price_paise
    if price_filter:
        query["price_paise"] = price_filter

    projection = {
        "_id": 1,
        "name": 1,
        "description": 1,
        "category": 1,
        "price_paise": 1,
        "is_available": 1,
        "tags": 1,
        "customization_groups": 1,
    }

    documents = list(
        db.menu_items.find(query, projection).limit(min(limit, 10))
    )

    items = [
        {
            "id": str(doc["_id"]),
            "name": doc["name"],
            "description": doc.get("description", ""),
            "category": doc.get("category", ""),
            "price": doc.get("price_paise", 0) / 100,
            "is_available": doc.get("is_available", False),
            "tags": doc.get("tags", []),
            "customization_groups": doc.get("customization_groups", []),
        }
        for doc in documents
    ]

    return {"items": items, "count": len(items)}


def get_item_details(db, menu_item_id: str) -> dict:
    """
    Full details for one item, including customization options.
    """
    document = db.menu_items.find_one({"_id": menu_item_id})

    if document is None:
        return {"error": "Item not found"}

    return {
        "id": str(document["_id"]),
        "name": document["name"],
        "description": document.get("description", ""),
        "category": document.get("category", ""),
        "price": document.get("price_paise", 0) / 100,
        "is_available": document.get("is_available", False),
        "tags": document.get("tags", []),
        "customization_groups": document.get("customization_groups", []),
    }


TOOL_DISPATCH = {
    "search_menu": search_menu,
    "get_item_details": get_item_details,
}

TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "search_menu",
            "description": (
                "Search available menu items by category, taste tags, "
                "and/or price range. Always call this before recommending "
                "anything - never invent items, prices, or availability."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "category": {
                        "type": "string",
                        "description": "Menu category, e.g. 'pasta', 'coffee', 'beverages'.",
                    },
                    "tags": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Taste/style keywords, e.g. ['spicy', 'creamy'].",
                    },
                    "max_price_paise": {
                        "type": "integer",
                        "description": "Maximum price in paise (₹1 = 100 paise).",
                    },
                    "min_price_paise": {
                        "type": "integer",
                        "description": "Minimum price in paise.",
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Max results to return, default 6.",
                    },
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_item_details",
            "description": "Get full details for a single menu item by id, including customization options.",
            "parameters": {
                "type": "object",
                "properties": {
                    "menu_item_id": {"type": "string"},
                },
                "required": ["menu_item_id"],
            },
        },
    },
]