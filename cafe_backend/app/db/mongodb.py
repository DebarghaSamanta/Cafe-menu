from pymongo import MongoClient
from pymongo.database import Database

from app.config import settings


COLLECTIONS = (
    "tables",
    "menu_items",
    "orders",
)


def create_mongo_client() -> MongoClient:
    """
    Create a MongoDB client.

    The client manages its own connection pool.
    """
    return MongoClient(
        settings.mongodb_uri,
        serverSelectionTimeoutMS=5000,
    )


def get_database(client: MongoClient) -> Database:
    """
    Return the configured application database.
    """
    return client[settings.mongodb_db_name]

def ensure_index(collection, keys, name, **options) -> None:
    """
    Create an index. If an index with this name already exists
    on different fields, drop it first so there is no conflict.
    """
    existing = {i["name"]: i for i in collection.list_indexes()}

    if name in existing and list(existing[name]["key"].items()) != keys:
        collection.drop_index(name)

    collection.create_index(keys, name=name, **options)


def ensure_database_structure(db: Database) -> None:
    existing_collections = set(db.list_collection_names())

    for collection_name in COLLECTIONS:
        if collection_name not in existing_collections:
            db.create_collection(collection_name)

    # Tables
    ensure_index(db.tables, [("table_number", 1)],
                 "uniq_table_number", unique=True)
    ensure_index(db.tables, [("qr_token_hash", 1)],
                 "uniq_qr_token_hash", unique=True, sparse=True)

    # Menu: category, category+availability, category+availability+price
    ensure_index(
        db.menu_items,
        [("category", 1), ("is_available", 1), ("price_paise", 1)],
        "idx_menu_filters",
    )
    # Menu: price-only filtering
    ensure_index(db.menu_items, [("price_paise", 1)], "idx_menu_price")

    # Orders
    ensure_index(
        db.orders,
        [("table_id", 1), ("created_at", -1)],
        "idx_orders_table_created",
    )