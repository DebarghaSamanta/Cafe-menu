from typing import Optional
from pydantic import BaseModel, Field


class ReviewCreate(BaseModel):
    customer_name: Optional[str] = Field(default="Guest", max_length=100)
    table_number: Optional[int] = Field(default=None, ge=1, le=100)
    rating: int = Field(ge=1, le=5)
    comment: str = Field(min_length=3, max_length=1000)


class ReviewUpdate(BaseModel):
    is_approved: Optional[bool] = None
    is_featured: Optional[bool] = None


class ReviewResponse(BaseModel):
    id: str
    customer_name: str
    table_number: Optional[int] = None
    rating: int
    comment: str
    is_approved: bool
    is_featured: bool
    created_at: str
