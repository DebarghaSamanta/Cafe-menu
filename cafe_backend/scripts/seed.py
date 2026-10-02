from urllib.parse import quote

from pymongo.errors import DuplicateKeyError

from app.config import settings
from app.db.mongodb import (
    create_mongo_client,
    ensure_database_structure,
    get_database,
)
from app.security import generate_table_token, hash_table_token


REQUIRED_TEST_TABLES = [
    {
        "_id": "table-007",
        "table_number": 7,
        "is_active": True,
    },
    {
            "_id": "table-008",
            "table_number": 8,
            "is_active": True,
    },
    {
            "_id": "table-010",
            "table_number": 10,
            "is_active": True,
    },

]


def ensure_test_tables(db) -> None:
    """
    Ensure Table 7 and Table 8 exist.

    These are specifically useful for verifying that
    table resolution is independent.
    """

    for table in REQUIRED_TEST_TABLES:
        db.tables.update_one(
            {"_id": table["_id"]},
            {
                "$setOnInsert": {
                    "_id": table["_id"],
                    "table_number": table["table_number"],
                    "is_active": table["is_active"],
                }
            },
            upsert=True,
        )


def build_qr_url(raw_token: str) -> str:
    """
    Build the URL that will eventually be encoded
    into the physical QR code.

    The token is put in the URL fragment so it is not
    sent to the web server as part of the HTTP request.
    """

    encoded_token = quote(raw_token, safe="")

    return f"{settings.qr_base_url}#table_token={encoded_token}"


def provision_missing_tokens(db) -> None:
    """
    Generate tokens only for tables that do not already
    have a token.

    This prevents accidentally changing existing QR codes
    every time the script is run.
    """

    tables = db.tables.find(
        {},
        {
            "_id": 1,
            "table_number": 1,
            "qr_token_hash": 1,
            "is_active": 1,
        },
    ).sort("table_number", 1)

    provisioned_count = 0

    for table in tables:
        if table.get("qr_token_hash"):
            print(
                f"Table {table['table_number']}: "
                "already provisioned; raw token is not recoverable."
            )
            continue

        raw_token = generate_table_token()
        token_hash = hash_table_token(raw_token)

        try:
            result = db.tables.update_one(
                {
                    "_id": table["_id"],
                    "qr_token_hash": {
                        "$exists": False
                    },
                },
                {
                    "$set": {
                        "qr_token_hash": token_hash,
                    }
                },
            )

        except DuplicateKeyError:
            print(
                f"Table {table['table_number']}: "
                "token collision detected; rerun provisioning."
            )
            continue

        if result.modified_count == 1:
            qr_url = build_qr_url(raw_token)

            print()
            print("=" * 70)
            print(f"TABLE {table['table_number']}")
            print(f"QR URL: {qr_url}")
            print("=" * 70)

            provisioned_count += 1

    print()
    print(f"New tokens provisioned: {provisioned_count}")


def main():
    client = create_mongo_client()

    try:
        client.admin.command("ping")

        db = get_database(client)

        ensure_database_structure(db)
        ensure_test_tables(db)

        provision_missing_tokens(db)

    finally:
        client.close()


if __name__ == "__main__":
    main()