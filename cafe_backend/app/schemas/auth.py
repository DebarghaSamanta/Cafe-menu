from typing import Literal, Optional
from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    username: str = Field(min_length=1)  # Can be username or email
    password: str = Field(min_length=1)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Optional[dict] = None


class UserResponse(BaseModel):
    id: str
    username: str
    email: Optional[str] = None
    role: str
    is_active: bool


class SendOtpRequest(BaseModel):
    email: str = Field(min_length=5, max_length=100)
    purpose: Literal["register", "login", "reset_password"]


class RegisterAdminRequest(BaseModel):
    email: str = Field(min_length=5, max_length=100)
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=6, max_length=100)
    otp: str = Field(min_length=6, max_length=6)


class LoginOtpRequest(BaseModel):
    email: str = Field(min_length=5, max_length=100)
    otp: str = Field(min_length=6, max_length=6)


class ResetPasswordRequest(BaseModel):
    email: str = Field(min_length=5, max_length=100)
    otp: str = Field(min_length=6, max_length=6)
    new_password: str = Field(min_length=6, max_length=100)


class GoogleAuthRequest(BaseModel):
    credential: str  # Google JWT ID Token