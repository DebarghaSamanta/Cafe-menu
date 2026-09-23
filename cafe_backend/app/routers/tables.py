from fastapi import APIRouter, Header, Request

from app.schemas.models import TableContextResponse
from app.services.table_resolution import (
    resolve_table_from_token,
)


router = APIRouter(
    prefix="/api/table",
    tags=["Tables"],
)


@router.get(
    "/context",
    response_model=TableContextResponse,
)
def get_table_context(
    request: Request,
    x_table_token: str | None = Header(
        default=None,
        alias="X-Table-Token",
    ),
):
    table = resolve_table_from_token(
        request.app.state.db,
        x_table_token,
    )

    return TableContextResponse(
        table_id=str(table["_id"]),
        table_number=table["table_number"],
        is_active=table["is_active"],
    )