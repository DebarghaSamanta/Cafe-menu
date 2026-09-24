from fastapi import HTTPException, status

from app.schemas.menu_admin import (
    AdminMenuItemCreate,
    AdminMenuItemUpdate,
)


def create_menu_item(
    db,
    menu_data: AdminMenuItemCreate,
):
    """
    Create a new menu item using the existing
    menu-xxx ID format.
    """

    # Get all existing menu IDs that follow
    # the existing menu-xxx format.
    menu_items = db.menu_items.find(
        {
            "_id": {
                "$regex": "^menu-[0-9]+$"
            }
        },
        {
            "_id": 1
        },
    )

    highest_number = 0

    for item in menu_items:
        item_id = item["_id"]

        try:
            number = int(
                item_id.split("-")[1]
            )

            if number > highest_number:
                highest_number = number

        except (IndexError, ValueError):
            continue

    next_number = highest_number + 1

    menu_id = f"menu-{next_number:03d}"

    menu_item = menu_data.model_dump()

    menu_item["_id"] = menu_id

    db.menu_items.insert_one(
        menu_item
    )

    return menu_item


def get_all_menu_items(db):
    """
    Return all menu items for Admin.
    """

    menu_items = list(
        db.menu_items.find()
    )

    for menu_item in menu_items:
        menu_item["_id"] = str(
            menu_item["_id"]
        )

    return menu_items


def get_menu_item(
    db,
    item_id: str,
):
    """
    Find a menu item by its existing menu ID.
    """

    menu_item = db.menu_items.find_one(
        {
            "_id": item_id
        }
    )

    if menu_item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Menu item not found",
        )

    return menu_item


def update_menu_item(
    db,
    item_id: str,
    menu_data: AdminMenuItemUpdate,
):
    """
    Update an existing menu item.
    """

    update_data = menu_data.model_dump(
        exclude_unset=True
    )

    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields provided for update",
        )

    result = db.menu_items.update_one(
        {
            "_id": item_id
        },
        {
            "$set": update_data
        },
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Menu item not found",
        )

    updated_item = db.menu_items.find_one(
        {
            "_id": item_id
        }
    )

    return updated_item


def delete_menu_item(
    db,
    item_id: str,
):
    """
    Delete an existing menu item.
    """

    result = db.menu_items.delete_one(
        {
            "_id": item_id
        }
    )

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Menu item not found",
        )

    return {
        "message": "Menu item deleted successfully"
    }