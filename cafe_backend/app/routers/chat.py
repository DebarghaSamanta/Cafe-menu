from fastapi import (
    APIRouter,
    Header,
    HTTPException,
    Request,
    status,
)

from app.schemas.models import (
    ChatRequest,
    ChatResponse,
)
from app.services.table_resolution import (
    resolve_table_from_token,
)
from app.services.chatbot import run_chat_turn

router = APIRouter(
    prefix="/api/chat",
    tags=["Chat"],
)


@router.post(
    "",
    response_model=ChatResponse,
)
def chat(
    payload: ChatRequest,
    request: Request,
    x_table_token: str | None = Header(
        default=None,
        alias="X-Table-Token",
    ),
):
    db = request.app.state.db

    # Re-uses the same table auth as menu/orders - only seated
    # customers with a valid QR token can use the assistant.
    resolve_table_from_token(db, x_table_token)

    try:
        result = run_chat_turn(
            db,
            payload.session_id,
            payload.message,
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The recommendation assistant is unavailable right now.",
        )

    return ChatResponse(
        reply=result["reply"],
        recommended_items=result["recommended_items"],
    )