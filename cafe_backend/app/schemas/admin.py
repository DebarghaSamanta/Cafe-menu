from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


# =========================================================
# REQUEST SCHEMAS
# =========================================================

class TableCreate(BaseModel):
    """
    Payload for creating a new table.
    """
    table_number: int = Field(ge=1)

    model_config = ConfigDict(extra="forbid")


class TableUpdate(BaseModel):
    """
    Payload for updating an existing table.
    """
    is_active: Optional[bool] = None

    model_config = ConfigDict(extra="forbid")


# =========================================================
# RESPONSE SCHEMAS
# =========================================================

class AdminTableResponse(BaseModel):
    id: str
    table_number: int = Field(ge=1)
    is_active: bool

    # The raw QR token is only returned once
    # at creation time. It is never stored in the DB.
    qr_token: Optional[str] = None

    # Full QR URL for the customer to scan.
    qr_url: Optional[str] = None

    model_config = ConfigDict(extra="forbid")


class AdminTableListResponse(BaseModel):
    tables: list[AdminTableResponse]
    total: int

    model_config = ConfigDict(extra="forbid")


class QRRegenerateResponse(BaseModel):
    """
    Returned after a QR token is regenerated for a table.
    """
    table_id: str
    table_number: int
    qr_token: str
    qr_url: str

    model_config = ConfigDict(extra="forbid")
