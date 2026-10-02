from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


# =========================================================
# REQUEST SCHEMAS
# =========================================================

class StaffCreate(BaseModel):
    """
    Payload for creating a new Staff user.
    """
    username: str = Field(
        min_length=3,
        max_length=50,
        pattern=r"^[a-zA-Z0-9_]+$",
    )

    password: str = Field(
        min_length=6,
        max_length=100,
    )

    display_name: Optional[str] = Field(
        default=None,
        max_length=100,
    )

    model_config = ConfigDict(extra="forbid")


class StaffUpdate(BaseModel):
    """
    Payload for updating an existing Staff user.
    All fields are optional.
    """
    display_name: Optional[str] = Field(
        default=None,
        max_length=100,
    )

    password: Optional[str] = Field(
        default=None,
        min_length=6,
        max_length=100,
    )

    is_active: Optional[bool] = None

    model_config = ConfigDict(extra="forbid")


# =========================================================
# RESPONSE SCHEMAS
# =========================================================

class StaffResponse(BaseModel):
    id: str
    username: str
    display_name: Optional[str] = None
    role: str
    is_active: bool

    model_config = ConfigDict(extra="forbid")


class StaffListResponse(BaseModel):
    staff: list[StaffResponse]
    total: int

    model_config = ConfigDict(extra="forbid")
