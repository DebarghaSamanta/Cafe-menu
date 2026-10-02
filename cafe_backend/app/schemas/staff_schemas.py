from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


# =========================================================
# STAFF OWN PROFILE
# =========================================================

class StaffProfileResponse(BaseModel):
    id: str
    username: str
    display_name: Optional[str] = None
    role: str
    is_active: bool

    model_config = ConfigDict(extra="forbid")


class StaffPasswordUpdate(BaseModel):
    """
    Staff can only update their own password and display name.
    """
    display_name: Optional[str] = Field(
        default=None,
        max_length=100,
    )

    current_password: str = Field(
        min_length=1,
    )

    new_password: str = Field(
        min_length=6,
        max_length=100,
    )

    model_config = ConfigDict(extra="forbid")


# =========================================================
# STAFF ORDER STATUS UPDATE
# =========================================================

class StaffOrderStatusUpdate(BaseModel):
    """
    Staff can only advance orders through the kitchen flow.
    Valid values: confirmed, preparing, ready
    """
    status: str = Field(
        description="confirmed | preparing | ready"
    )

    model_config = ConfigDict(extra="forbid")


# =========================================================
# STAFF MENU AVAILABILITY TOGGLE
# =========================================================

class MenuAvailabilityUpdate(BaseModel):
    """
    Staff can toggle a menu item's availability (e.g. out of stock).
    """
    is_available: bool

    model_config = ConfigDict(extra="forbid")
