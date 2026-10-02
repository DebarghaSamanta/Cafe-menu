from bson import ObjectId
from fastapi import HTTPException, status

from app.schemas.staff_admin import (
    StaffCreate,
    StaffListResponse,
    StaffResponse,
    StaffUpdate,
)
from app.security import hash_password


def _serialize_staff(doc: dict) -> StaffResponse:
    return StaffResponse(
        id=str(doc["_id"]),
        username=doc["username"],
        display_name=doc.get("display_name"),
        role=doc["role"],
        is_active=doc.get("is_active", True),
    )


def list_staff(db) -> StaffListResponse:
    """
    Return all Staff users (excludes Admins).
    """

    docs = list(
        db.users
        .find({"role": "STAFF"})
        .sort("username", 1)
    )

    staff = [_serialize_staff(doc) for doc in docs]

    return StaffListResponse(
        staff=staff,
        total=len(staff),
    )


def _id_query(id_str: str) -> dict:
    if ObjectId.is_valid(id_str):
        return {"$or": [{"_id": ObjectId(id_str)}, {"_id": id_str}]}
    return {"_id": id_str}


def get_staff_member(db, staff_id: str) -> StaffResponse:
    """
    Return one Staff user by ID.
    """
    query = _id_query(staff_id)
    query["role"] = "STAFF"

    doc = db.users.find_one(query)

    if doc is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Staff member not found",
        )

    return _serialize_staff(doc)


def create_staff_member(
    db,
    payload: StaffCreate,
) -> StaffResponse:
    """
    Create a new Staff user.
    Raises 409 if the username is already taken.
    """

    existing = db.users.find_one(
        {"username": payload.username}
    )

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Username '{payload.username}' is already taken",
        )

    doc = {
        "username": payload.username,
        "password_hash": hash_password(payload.password),
        "display_name": payload.display_name,
        "role": "STAFF",
        "is_active": True,
    }

    result = db.users.insert_one(doc)

    doc["_id"] = result.inserted_id

    return _serialize_staff(doc)


def update_staff_member(
    db,
    staff_id: str,
    payload: StaffUpdate,
) -> StaffResponse:
    """
    Update display_name, password, and/or is_active for a Staff user.
    """
    query = _id_query(staff_id)
    query["role"] = "STAFF"

    update_fields: dict = {}

    if payload.display_name is not None:
        update_fields["display_name"] = payload.display_name

    if payload.password is not None:
        update_fields["password_hash"] = hash_password(
            payload.password
        )

    if payload.is_active is not None:
        update_fields["is_active"] = payload.is_active

    if not update_fields:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields provided for update",
        )

    result = db.users.update_one(
        query,
        {"$set": update_fields},
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Staff member not found",
        )

    updated = db.users.find_one(_id_query(staff_id))

    return _serialize_staff(updated)


def delete_staff_member(db, staff_id: str) -> dict:
    """
    Permanently delete a Staff user.
    """
    query = _id_query(staff_id)
    query["role"] = "STAFF"

    result = db.users.delete_one(query)

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Staff member not found",
        )

    return {"message": "Staff member deleted successfully"}

