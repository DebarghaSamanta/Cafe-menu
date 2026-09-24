import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import settings

TOKEN_BYTES = 32


def generate_table_token() -> str:
    """
    Generate a cryptographically secure random token.

    32 random bytes gives 256 bits of entropy.
    """
    return secrets.token_urlsafe(TOKEN_BYTES)


def hash_table_token(raw_token: str) -> str:
    """
    Hash the raw table token using SHA-256.

    The raw token must never be stored in MongoDB.
    """
    return hashlib.sha256(
        raw_token.encode("utf-8")
    ).hexdigest()

# Password hashing
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(
    plain_password: str,
    password_hash: str,
) -> bool:
    return pwd_context.verify(
        plain_password,
        password_hash,
    )


# JWT
def create_access_token(
    user_id: str,
    username: str,
    role: str,
) -> str:

    expire = (
        datetime.now(timezone.utc)
        + timedelta(
            minutes=settings.access_token_expire_minutes
        )
    )

    payload = {
        "sub": user_id,
        "username": username,
        "role": role,
        "exp": expire,
    }

    return jwt.encode(
        payload,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )


def decode_access_token(token: str) -> dict:

    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )

        return payload

    except JWTError:
        raise ValueError("Invalid or expired token")

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/auth/login"
)


def get_current_user(
    token: str = Depends(oauth2_scheme),
):
    """
    Decode the JWT and return the authenticated user information.
    """

    try:
        payload = decode_access_token(token)

        user_id = payload.get("sub")
        username = payload.get("username")
        role = payload.get("role")

        if not user_id or not username or not role:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token",
            )

        return {
            "id": user_id,
            "username": username,
            "role": role,
        }

    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={
                "WWW-Authenticate": "Bearer"
            },
        )


def require_authenticated_user(
    current_user: dict = Depends(get_current_user),
):
    """
    Allow any authenticated user.
    """

    return current_user


def require_admin(
    current_user: dict = Depends(get_current_user),
):
    """
    Allow only ADMIN users.
    """

    if current_user["role"] != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )

    return current_user


def require_staff(
    current_user: dict = Depends(get_current_user),
):
    """
    Allow only STAFF users.
    """

    if current_user["role"] != "STAFF":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff access required",
        )

    return current_user