import re

from app.services.embeddings import (
    EmbeddingError,
    build_embedding_text,
    get_embedding,
)


CANDIDATE_POOL_SIZE = 50
MIN_SIMILARITY_SCORE = 0.3
RELEVANCE_MARGIN = 0.05
def _build_structured_query(
    category: str | None,
    tags: list[str] | None,
    max_price_paise: int | None,
    min_price_paise: int | None,
) -> dict:
    query: dict = {"is_available": True}

    if category:
        query["category"] = {
            "$regex": f"^{re.escape(category.strip())}$",
            "$options": "i",
        }

    if tags:
        query["tags"] = {"$in": [t.lower().strip() for t in tags]}

    price_filter: dict = {}
    if min_price_paise is not None:
        price_filter["$gte"] = min_price_paise
    if max_price_paise is not None:
        price_filter["$lte"] = max_price_paise
    if price_filter:
        query["price_paise"] = price_filter

    return query


def _to_item_dict(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "name": doc["name"],
        "description": doc.get("description", ""),
        "category": doc.get("category", ""),
        "price": doc.get("price_paise", 0) / 100,
        "is_available": doc.get("is_available", False),
        "tags": doc.get("tags", []),
        "customization_groups": doc.get("customization_groups", []),
    }


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0

    dot = sum(x * y for x, y in zip(a, b))
    norm_a = sum(x * x for x in a) ** 0.5
    norm_b = sum(y * y for y in b) ** 0.5

    if norm_a == 0 or norm_b == 0:
        return 0.0

    return dot / (norm_a * norm_b)


def search_menu(
    db,
    category: str | None = None,
    tags: list[str] | None = None,
    max_price_paise: int | None = None,
    min_price_paise: int | None = None,
    search_query: str | None = None,
    limit: int = 6,
) -> dict:
    """
    Search available menu items. Read-only - never modifies the database.

    - Structured filters (category, tags, price) always apply.
    - When search_query is given, results are ranked by semantic
      similarity to the query over each item's name/description/
      category/tags (via the `embedding` field on the document).
      Items without an embedding are skipped for ranking.
    - If semantic search finds no embedded candidates - because no
      items have been embedded yet, the provider isn't configured,
      the provider call fails, or none survive the structured
      filters - this falls back to plain structured search so the
      API never errors out just because embeddings are missing.
    """
    limit = min(limit, 10)
    query = _build_structured_query(
        category, tags, max_price_paise, min_price_paise
    )

    display_projection = {
        "_id": 1,
        "name": 1,
        "description": 1,
        "category": 1,
        "price_paise": 1,
        "is_available": 1,
        "tags": 1,
        "customization_groups": 1,
    }

    def structured_fallback() -> dict:
        documents = list(
            db.menu_items.find(query, display_projection).limit(limit)
        )
        items = [_to_item_dict(doc) for doc in documents]
        return {"items": items, "count": len(items)}

    if not search_query or not search_query.strip():
        return structured_fallback()

    try:
        query_embedding = get_embedding(search_query.strip())
    except EmbeddingError:
        return structured_fallback()

    embedded_query = {**query, "embedding": {"$exists": True}}
    embedded_projection = {**display_projection, "embedding": 1}

    candidates = list(
        db.menu_items.find(embedded_query, embedded_projection)
    )

    if not candidates:
        return structured_fallback()

    scored = [
        (
            _cosine_similarity(query_embedding, doc.get("embedding", [])),
            doc,
        )
        for doc in candidates
    ]
    scored.sort(key=lambda pair: pair[0], reverse=True)
    for score, doc in scored:
        print(f"[search_menu debug] {score:.3f}  {doc['name']}")

    if not scored:
        return {"items": [], "count": 0}

    top_score = scored[0][0]
    relevant = [
        doc
        for score, doc in scored
        if score >= MIN_SIMILARITY_SCORE
        and score >= top_score - RELEVANCE_MARGIN
    ]

    items = [_to_item_dict(doc) for doc in relevant[:limit]]

    return {"items": items, "count": len(items)}


def get_item_details(db, menu_item_id: str) -> dict:
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
                "Search available menu items. Use search_query for "
                "natural-language taste/mood preferences (e.g. "
                "'something with chicken', 'a light breakfast', "
                "'creamy pasta', 'something refreshing', 'similar to "
                "a sandwich') - it searches semantically across the "
                "item's name, description, category and tags. Use "
                "category/tags/price for explicit, exact constraints. "
                "Always call this before recommending anything - "
                "never invent items, prices, or availability."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "search_query": {
                        "type": "string",
                        "description": (
                            "A natural-language description of what "
                            "the customer wants, e.g. 'something with "
                            "chicken and bread' or 'a light breakfast'."
                        ),
                    },
                    "category": {
                        "type": "string",
                        "description": "Exact menu category, e.g. 'Pasta', 'Coffee', 'Beverages'.",
                    },
                    "tags": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Explicit taste/style tags, e.g. ['spicy', 'creamy'].",
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