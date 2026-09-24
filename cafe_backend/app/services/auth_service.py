from fastapi import HTTPException, status

from app.security import (
    verify_password,
    create_access_token,
)


def authenticate_user(
    db,
    username: str,
    password: str,
):
    """
    Find the user and verify the provided password.
    """

    user = db.users.find_one(
        {
            "username": username
        }
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    if not user.get("is_active", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    if not verify_password(
        password,
        user["password_hash"],
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    return user


def login_user(
    db,
    username: str,
    password: str,
) -> str:
    """
    Authenticate the user and create an access token.
    """

    user = authenticate_user(
        db,
        username,
        password,
    )

    access_token = create_access_token(
        user_id=str(user["_id"]),
        username=user["username"],
        role=user["role"],
    )

    return access_token