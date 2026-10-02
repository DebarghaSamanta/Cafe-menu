from fastapi import APIRouter, Depends, Request, status

from app.schemas.admin import (
    AdminTableListResponse,
    AdminTableResponse,
    QRRegenerateResponse,
    TableCreate,
    TableUpdate,
)
from app.security import require_admin
from app.services.admin_service import (
    create_table,
    delete_table,
    get_table,
    list_tables,
    regenerate_qr_token,
    update_table,
)


router = APIRouter(
    prefix="/tables",
    tags=["Admin Tables"],
)


@router.get(
    "",
    response_model=AdminTableListResponse,
    dependencies=[Depends(require_admin)],
)
def list_all_tables(request: Request):
    """
    List all tables sorted by table number.
    """

    return list_tables(request.app.state.db)


@router.get(
    "/{table_id}",
    response_model=AdminTableResponse,
    dependencies=[Depends(require_admin)],
)
def get_one_table(table_id: str, request: Request):
    """
    Get details for a single table.
    Note: qr_token is NOT included here — it is only
    returned once at creation or after a regenerate call.
    """

    return get_table(
        request.app.state.db,
        table_id,
    )


@router.post(
    "",
    response_model=AdminTableResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_admin)],
)
def create_new_table(
    payload: TableCreate,
    request: Request,
):
    """
    Create a new table and generate its QR token.

    ⚠️  The raw qr_token is returned only once in this response.
    It is NEVER stored in the database (only its SHA-256 hash is).
    Save it immediately or use the regenerate endpoint to get a new one.
    """

    return create_table(
        request.app.state.db,
        payload,
    )


@router.patch(
    "/{table_id}",
    response_model=AdminTableResponse,
    dependencies=[Depends(require_admin)],
)
def update_table_details(
    table_id: str,
    payload: TableUpdate,
    request: Request,
):
    """
    Update a table's is_active status.
    Deactivating a table invalidates its QR code for customers.
    """

    return update_table(
        request.app.state.db,
        table_id,
        payload,
    )


@router.post(
    "/{table_id}/regenerate-qr",
    response_model=QRRegenerateResponse,
    dependencies=[Depends(require_admin)],
)
def regenerate_table_qr(
    table_id: str,
    request: Request,
):
    """
    Generate a brand-new QR token for an existing table,
    replacing the old one (invalidating all previous QR codes).

    ⚠️  The raw qr_token is returned only once in this response.
    """

    return regenerate_qr_token(
        request.app.state.db,
        table_id,
    )


@router.delete(
    "/{table_id}",
    dependencies=[Depends(require_admin)],
)
def delete_one_table(table_id: str, request: Request):
    """
    Permanently delete a table.
    """

    return delete_table(
        request.app.state.db,
        table_id,
    )
