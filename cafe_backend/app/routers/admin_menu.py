from fastapi import APIRouter, Depends, Request

from app.schemas.menu_admin import (
    AdminMenuItemCreate,
    AdminMenuItemUpdate,
)
from app.security import require_admin
from app.services.menu_admin_service import (
    create_menu_item,
    get_all_menu_items,
    get_menu_item,
    update_menu_item,
    delete_menu_item,
)


router = APIRouter(
    prefix="/api/admin/menu",
    tags=["Admin Menu"],
)


@router.post(
    "",
    dependencies=[Depends(require_admin)],
)
def create_menu(
    payload: AdminMenuItemCreate,
    request: Request,
):
    """
    Create a new menu item.
    """

    return create_menu_item(
        request.app.state.db,
        payload,
    )


@router.get(
    "",
    dependencies=[Depends(require_admin)],
)
def get_menu_items(
    request: Request,
):
    """
    Get all menu items for Admin.
    """

    return get_all_menu_items(
        request.app.state.db
    )


@router.get(
    "/{item_id}",
    dependencies=[Depends(require_admin)],
)
def get_menu(
    item_id: str,
    request: Request,
):
    """
    Get one menu item.
    """

    return get_menu_item(
        request.app.state.db,
        item_id,
    )


@router.put(
    "/{item_id}",
    dependencies=[Depends(require_admin)],
)
def update_menu(
    item_id: str,
    payload: AdminMenuItemUpdate,
    request: Request,
):
    """
    Update a menu item.
    """

    return update_menu_item(
        request.app.state.db,
        item_id,
        payload,
    )


@router.delete(
    "/{item_id}",
    dependencies=[Depends(require_admin)],
)
def delete_menu(
    item_id: str,
    request: Request,
):
    """
    Delete a menu item.
    """

    return delete_menu_item(
        request.app.state.db,
        item_id,
    )