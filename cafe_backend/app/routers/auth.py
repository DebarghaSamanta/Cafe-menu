from fastapi import APIRouter, Request, status

from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    SendOtpRequest,
    RegisterAdminRequest,
    LoginOtpRequest,
    ResetPasswordRequest,
    GoogleAuthRequest,
)
from app.services.auth_service import (
    login_user,
    register_admin,
    login_with_otp,
    reset_password_with_otp,
    google_auth_login,
)
from app.services.otp_service import create_and_send_otp


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
    Login an Admin with username or email + password.
    """
    access_token, user = login_user(
        request.app.state.db,
        payload.username,
        payload.password,
    )
    return TokenResponse(
        access_token=access_token,
        user=user,
    )


@router.post(
    "/otp/send",
)
def send_otp(
    payload: SendOtpRequest,
    request: Request,
):
    """
    Send a 6-digit email OTP for register, login, or reset_password.
    """
    return create_and_send_otp(
        request.app.state.db,
        payload.email,
        payload.purpose,
    )


@router.post(
    "/register-admin",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(
    payload: RegisterAdminRequest,
    request: Request,
):
    """
    Register a new Admin after email OTP verification.
    """
    access_token, user = register_admin(
        request.app.state.db,
        payload.email,
        payload.username,
        payload.password,
        payload.otp,
    )
    return TokenResponse(
        access_token=access_token,
        user=user,
    )


@router.post(
    "/login-otp",
    response_model=TokenResponse,
)
def login_otp(
    payload: LoginOtpRequest,
    request: Request,
):
    """
    Login an Admin using email + 6-digit verification code.
    """
    access_token, user = login_with_otp(
        request.app.state.db,
        payload.email,
        payload.otp,
    )
    return TokenResponse(
        access_token=access_token,
        user=user,
    )


@router.post(
    "/forgot-password/reset",
)
def reset_password(
    payload: ResetPasswordRequest,
    request: Request,
):
    """
    Reset account password using email + 6-digit OTP verification.
    """
    return reset_password_with_otp(
        request.app.state.db,
        payload.email,
        payload.otp,
        payload.new_password,
    )


@router.post(
    "/google",
    response_model=TokenResponse,
)
def google_auth(
    payload: GoogleAuthRequest,
    request: Request,
):
    """
    Authenticate via Google OAuth ID token (Instant 1-Click Login/Register).
    """
    access_token, user = google_auth_login(
        request.app.state.db,
        payload.credential,
    )
    return TokenResponse(
        access_token=access_token,
        user=user,
    )