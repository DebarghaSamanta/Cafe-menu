from fastapi import APIRouter, Depends, Request, status

from app.schemas.staff_admin import (
    StaffCreate,
    StaffListResponse,
    StaffResponse,
    StaffUpdate,
)
from app.security import require_admin
from app.services.staff_admin_service import (
    create_staff_member,
    delete_staff_member,
    get_staff_member,
    list_staff,
    update_staff_member,
)


router = APIRouter(
    prefix="/staff",
    tags=["Admin Staff"],
)


@router.get(
    "",
    response_model=StaffListResponse,
    dependencies=[Depends(require_admin)],
)
def list_all_staff(request: Request):
    """
    List all Staff users sorted by username.
    """

    return list_staff(request.app.state.db)


@router.get(
    "/{staff_id}",
    response_model=StaffResponse,
    dependencies=[Depends(require_admin)],
)
def get_one_staff(staff_id: str, request: Request):
    """
    Get a single Staff member by their ID.
    """

    return get_staff_member(
        request.app.state.db,
        staff_id,
    )


@router.post(
    "",
    response_model=StaffResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_admin)],
)
def create_staff(
    payload: StaffCreate,
    request: Request,
):
    """
    Create a new Staff user.
    Username must be unique (3-50 chars, alphanumeric + underscores).
    Password must be at least 6 characters.
    """

    return create_staff_member(
        request.app.state.db,
        payload,
    )


@router.patch(
    "/{staff_id}",
    response_model=StaffResponse,
    dependencies=[Depends(require_admin)],
)
def update_staff(
    staff_id: str,
    payload: StaffUpdate,
    request: Request,
):
    """
    Update a Staff member's display_name, password, or is_active status.
    All fields are optional — only provided fields will be updated.
    """

    return update_staff_member(
        request.app.state.db,
        staff_id,
        payload,
    )


@router.delete(
    "/{staff_id}",
    dependencies=[Depends(require_admin)],
)
def delete_staff(staff_id: str, request: Request):
    """
    Permanently delete a Staff member.
    """

    return delete_staff_member(
        request.app.state.db,
        staff_id,
    )
