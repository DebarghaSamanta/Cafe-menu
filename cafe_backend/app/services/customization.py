from fastapi import HTTPException, status


def price_delta_for_customizations(
    menu_document: dict,
    requested_customizations: list[dict],
) -> tuple[int, list[dict]]:
    """
    Validate requested customizations against the menu item's
    configured customization_groups.

    Returns:
      - total price delta in paise (per unit)
      - a normalized snapshot to store on the order
    """
    groups_by_id = {
        g["id"]: g for g in menu_document.get("customization_groups", [])
    }

    if requested_customizations and not groups_by_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{menu_document.get('name', 'This item')} is not customizable",
        )

    requested_by_group = {
        c["group_id"]: c["choice_ids"] for c in requested_customizations
    }

    unknown_groups = set(requested_by_group) - set(groups_by_id)
    if unknown_groups:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown customization group(s): {sorted(unknown_groups)}",
        )

    total_delta_paise = 0
    snapshot = []

    for group_id, group in groups_by_id.items():
        chosen_ids = requested_by_group.get(group_id, [])

        if group.get("required") and not chosen_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"'{group['label']}' selection is required",
            )

        if group["type"] == "single" and len(chosen_ids) > 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"'{group['label']}' allows only one selection",
            )

        choices_by_id = {c["id"]: c for c in group["choices"]}
        invalid_ids = set(chosen_ids) - set(choices_by_id)
        if invalid_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid choice(s) for '{group['label']}': {sorted(invalid_ids)}",
            )

        selected_choices = [choices_by_id[cid] for cid in chosen_ids]
        total_delta_paise += sum(
            c.get("price_delta_paise", 0) for c in selected_choices
        )

        if selected_choices:
            snapshot.append(
                {
                    "group_id": group_id,
                    "group_label": group["label"],
                    "choices": [
                        {
                            "id": c["id"],
                            "label": c["label"],
                            "price_delta_paise": c.get("price_delta_paise", 0),
                        }
                        for c in selected_choices
                    ],
                }
            )

    return total_delta_paise, snapshot