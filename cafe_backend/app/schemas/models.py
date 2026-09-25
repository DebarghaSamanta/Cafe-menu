from datetime import datetime
from enum import Enum
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field


# =========================================================
# TABLES
# =========================================================

class TableStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"


class TableResponse(BaseModel):
    id: str
    table_number: int = Field(ge=1)
    is_active: bool = True


class TableContextResponse(BaseModel):
    table_id: str
    table_number: int
    is_active: bool

    model_config = ConfigDict(extra="forbid")


# =========================================================
# MENU
# =========================================================
class CustomizationChoice(BaseModel):
    id: str = Field(min_length=1, max_length=50)
    label: str = Field(min_length=1, max_length=100)
    price_delta_paise: int = Field(default=0, ge=0)


class CustomizationGroup(BaseModel):
    id: str = Field(min_length=1, max_length=50)
    label: str = Field(min_length=1, max_length=100)
    type: Literal["single", "multi"]
    required: bool = False
    choices: list[CustomizationChoice] = Field(min_length=1)

class MenuItemResponse(BaseModel):
    id: str

    name: str = Field(
        min_length=1,
        max_length=100,
    )

    description: str = Field(
        min_length=1,
        max_length=500,
    )

    category: str = Field(
        min_length=1,
        max_length=50,
    )

    price: float = Field(ge=0)

    is_available: bool

    customization_groups: list[CustomizationGroup] = Field(
        default_factory=list
    )


class MenuResponse(BaseModel):
    items: list[MenuItemResponse]

    model_config = ConfigDict(extra="forbid")


# =========================================================
# ORDERS
# =========================================================
class SelectedCustomization(BaseModel):
    group_id: str = Field(min_length=1, max_length=50)
    choice_ids: list[str] = Field(min_length=1, max_length=20)

    model_config = ConfigDict(extra="forbid")

class OrderStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    PREPARING = "preparing"
    READY = "ready"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

MAX_ORDER_ITEM_QUANTITY = 10
MAX_DISTINCT_ORDER_ITEMS = 50

class CreateOrderItemRequest(BaseModel):
    menu_item_id: str = Field(
        min_length=1,
        max_length=100,
    )

    quantity: int = Field(
        ge=1,
        le=MAX_ORDER_ITEM_QUANTITY,
    )
    customizations: list[SelectedCustomization] = Field(
        default_factory=list
    )
    model_config = ConfigDict(
        extra="forbid"
    )

class CreateOrderRequest(BaseModel):
    items: list[CreateOrderItemRequest] = Field(
        min_length=1,
        max_length=MAX_DISTINCT_ORDER_ITEMS,
    )

    model_config = ConfigDict(
        extra="forbid"
    )

class SelectedCustomizationChoiceResponse(BaseModel):
    id: str
    label: str
    price_delta_paise: int = 0


class SelectedCustomizationGroupResponse(BaseModel):
    group_id: str
    group_label: str
    choices: list[SelectedCustomizationChoiceResponse]

class OrderItemResponse(BaseModel):
    menu_item_id: str

    name: str

    category: str

    # Stored in paise internally.
    # This response keeps the backend representation
    # explicit for future order processing.
    unit_price_paise: int = Field(ge=0)

    quantity: int = Field(
        ge=1,
        le=MAX_ORDER_ITEM_QUANTITY,
    )

    line_total_paise: int = Field(ge=0)
    customizations: list[SelectedCustomizationGroupResponse] = Field(
        default_factory=list
    )

class OrderResponse(BaseModel):
    id: str

    table_id: str

    table_number: int = Field(ge=1)

    items: list[OrderItemResponse] = Field(
        min_length=1
    )

    total_paise: int = Field(ge=0)

    status: OrderStatus

    created_at: datetime

    model_config = ConfigDict(
        extra="forbid"
    )



class ChatRequest(BaseModel):
    session_id: str = Field(min_length=1, max_length=100)
    message: str = Field(min_length=1, max_length=500)

    model_config = ConfigDict(extra="forbid")


class RecommendedItemResponse(BaseModel):
    id: str
    name: str
    description: str
    category: str
    price: float
    is_available: bool = True
    tags: list[str] = Field(default_factory=list)
    customization_groups: list[CustomizationGroup] = Field(
        default_factory=list
    )


class ChatResponse(BaseModel):
    reply: str
    recommended_items: list[RecommendedItemResponse] = Field(
        default_factory=list
    )

# =========================================================
# HEALTH
# =========================================================

class HealthResponse(BaseModel):
    status: str
    database: str

    model_config = ConfigDict(extra="forbid")