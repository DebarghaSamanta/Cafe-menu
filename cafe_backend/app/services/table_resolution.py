from fastapi import HTTPException, status
from pymongo.database import Database

from app.security import hash_table_token


def resolve_table_from_token(
    db: Database,
    raw_token: str | None,
) -> dict:
    """
    Resolve the authenticated table from the QR token.

    The raw token is never stored or returned.
    """

    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Table token is required",
        )

    token_hash = hash_table_token(raw_token)

    table = db.tables.find_one(
        {
            "qr_token_hash": token_hash,
            "is_active": True,
        },
        {
            "_id": 1,
            "table_number": 1,
            "is_active": 1,
        },
    )

    if table is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or inactive table token",
        )

    return table