from typing import List, Optional

from pydantic import BaseModel, Field


class MenuSize(BaseModel):
    name: str = Field(
        min_length=1,
        max_length=50,
    )

    price_paise: int = Field(
        default=0,
        ge=0,
    )

    is_available: bool = True


class MenuAddon(BaseModel):
    name: str = Field(
        min_length=1,
        max_length=100,
    )

    price_paise: int = Field(
        default=0,
        ge=0,
    )

    is_available: bool = True


class MenuCustomization(BaseModel):
    sizes: List[MenuSize] = Field(
        default_factory=list,
    )

    addons: List[MenuAddon] = Field(
        default_factory=list,
    )


class AdminMenuItemCreate(BaseModel):
    name: str = Field(
        min_length=1,
        max_length=100,
    )

    description: Optional[str] = None

    category: str = Field(
        min_length=1,
        max_length=50,
    )

    price_paise: int = Field(
        ge=0,
    )

    is_available: bool = True

    customization: MenuCustomization = Field(
        default_factory=MenuCustomization,
    )


class AdminMenuItemUpdate(BaseModel):
    name: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=100,
    )

    description: Optional[str] = None

    category: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=50,
    )

    price_paise: Optional[int] = Field(
        default=None,
        ge=0,
    )

    is_available: Optional[bool] = None

    customization: Optional[MenuCustomization] = None