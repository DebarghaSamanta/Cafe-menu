from bson import ObjectId
from fastapi import HTTPException, status
from pymongo.errors import DuplicateKeyError

from app.config import settings
from app.schemas.admin import (
    AdminTableListResponse,
    AdminTableResponse,
    QRRegenerateResponse,
    TableCreate,
    TableUpdate,
)
from app.security import (
    generate_table_token,
    hash_table_token,
)


def _build_qr_url(raw_token: str) -> str:
    """
    Build the full QR URL that will be encoded in the QR code.
    """
    return f"{settings.qr_base_url}#table_token={raw_token}"


def _serialize_table(
    doc: dict,
    qr_token: str | None = None,
) -> AdminTableResponse:
    token = qr_token or doc.get("qr_token")
    qr_url = doc.get("qr_url") or (_build_qr_url(token) if token else None)

    return AdminTableResponse(
        id=str(doc["_id"]),
        table_number=doc["table_number"],
        is_active=doc.get("is_active", True),
        qr_token=token,
        qr_url=qr_url,
    )


def list_tables(db) -> AdminTableListResponse:
    """
    Return all tables sorted by table_number with persistent QR tokens and URLs.
    """
    docs = list(
        db.tables
        .find()
        .sort("table_number", 1)
    )

    tables = []
    for doc in docs:
        token = doc.get("qr_token")
        if not token:
            token = generate_table_token()
            token_hash = hash_table_token(token)
            qr_url = _build_qr_url(token)
            db.tables.update_one(
                {"_id": doc["_id"]},
                {
                    "$set": {
                        "qr_token": token,
                        "qr_token_hash": token_hash,
                        "qr_url": qr_url,
                    }
                },
            )
            doc["qr_token"] = token
            doc["qr_url"] = qr_url
        tables.append(_serialize_table(doc))

    return AdminTableListResponse(
        tables=tables,
        total=len(tables),
    )


def _id_query(id_str: str) -> dict:
    if ObjectId.is_valid(id_str):
        return {"$or": [{"_id": ObjectId(id_str)}, {"_id": id_str}]}
    return {"_id": id_str}


def get_table(db, table_id: str) -> AdminTableResponse:
    """
    Return a single table by its ID.
    """
    doc = db.tables.find_one(_id_query(table_id))

    if doc is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Table not found",
        )

    return _serialize_table(doc)


def create_table(
    db,
    payload: TableCreate,
) -> AdminTableResponse:
    """
    Create a new table and generate its first QR token.

    The raw token is returned once and never stored.
    Only the SHA-256 hash is persisted in MongoDB.
    """

    raw_token = generate_table_token()
    token_hash = hash_table_token(raw_token)
    qr_url = _build_qr_url(raw_token)

    table_id = f"table-{payload.table_number:03d}"

    doc = {
        "_id": table_id,
        "table_number": payload.table_number,
        "qr_token": raw_token,
        "qr_token_hash": token_hash,
        "qr_url": qr_url,
        "is_active": True,
    }

    try:
        db.tables.insert_one(doc)
    except DuplicateKeyError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Table number {payload.table_number} "
                f"or ID '{table_id}' already exists"
            ),
        )

    return _serialize_table(doc, qr_token=raw_token)


def update_table(
    db,
    table_id: str,
    payload: TableUpdate,
) -> AdminTableResponse:
    """
    Update a table's is_active status.
    """
    query = _id_query(table_id)

    update_fields: dict = {}

    if payload.is_active is not None:
        update_fields["is_active"] = payload.is_active

    if not update_fields:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields provided for update",
        )

    result = db.tables.update_one(
        query,
        {"$set": update_fields},
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Table not found",
        )

    updated = db.tables.find_one(query)

    return _serialize_table(updated)


def regenerate_qr_token(
    db,
    table_id: str,
) -> QRRegenerateResponse:
    """
    Generate a brand-new QR token for an existing table,
    replacing the old one.
    """
    query = _id_query(table_id)
    doc = db.tables.find_one(query)

    if doc is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Table not found",
        )

    raw_token = generate_table_token()
    token_hash = hash_table_token(raw_token)
    qr_url = _build_qr_url(raw_token)

    db.tables.update_one(
        query,
        {
            "$set": {
                "qr_token": raw_token,
                "qr_token_hash": token_hash,
                "qr_url": qr_url,
            }
        },
    )

    return QRRegenerateResponse(
        table_id=str(doc["_id"]),
        table_number=doc["table_number"],
        qr_token=raw_token,
        qr_url=qr_url,
    )


def delete_table(db, table_id: str) -> dict:
    """
    Delete a table by its ID.
    """
    query = _id_query(table_id)
    result = db.tables.delete_one(query)

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Table not found",
        )

    return {"message": "Table deleted successfully"}

