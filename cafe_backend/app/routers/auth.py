from fastapi import APIRouter, Request

from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
)
from app.services.auth_service import (
    login_user,
)


router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"],
)


@router.post(
    "/login",
    response_model=TokenResponse,
)
def login(
    payload: LoginRequest,
    request: Request,
):
    """
    Login an Admin or Staff user
    and return a JWT access token.
    """

    access_token = login_user(
        request.app.state.db,
        payload.username,
        payload.password,
    )

    return TokenResponse(
        access_token=access_token,
    )