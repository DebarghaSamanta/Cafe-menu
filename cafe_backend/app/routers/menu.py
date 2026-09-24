from decimal import Decimal

from fastapi import (
    APIRouter,
    HTTPException,
    Query,
    Request,
)
from pymongo.errors import PyMongoError

from app.schemas.models import (
    MenuItemResponse,
    MenuResponse,
)


router = APIRouter(
    prefix="/api/menu",
    tags=["Menu"],
)


def rupees_to_paise(value: Decimal) -> int:
    """
    Convert rupees to integer paise.

    Example:
        150.00 -> 15000

    Values with more than two decimal places are rejected.
    """

    if value < 0:
        raise HTTPException(
            status_code=400,
            detail="Price cannot be negative",
        )

    # Make sure we don't silently truncate values like:
    # 100.123
    if value != value.quantize(Decimal("0.01")):
        raise HTTPException(
            status_code=400,
            detail="Price can have at most 2 decimal places",
        )

    return int(value * 100)


@router.get(
    "",
    response_model=MenuResponse,
)
def get_menu(
    request: Request,

    category: str | None = Query(
        default=None,
        min_length=1,
        max_length=50,
        description="Exact menu category",
    ),

    min_price: Decimal | None = Query(
        default=None,
        ge=0,
        description="Minimum price in rupees",
    ),

    max_price: Decimal | None = Query(
        default=None,
        ge=0,
        description="Maximum price in rupees",
    ),

    available_only: bool = Query(
        default=False,
        description="Return only available items",
    ),
):
    """
    Return menu items with optional filtering.

    MongoDB stores price in paise.
    API returns price in rupees.
    """

    # -------------------------------------------------
    # Validate price range
    # -------------------------------------------------

    min_price_paise = None
    max_price_paise = None

    if min_price is not None:
        min_price_paise = rupees_to_paise(min_price)

    if max_price is not None:
        max_price_paise = rupees_to_paise(max_price)

    if (
        min_price_paise is not None
        and max_price_paise is not None
        and min_price_paise > max_price_paise
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "min_price cannot be greater "
                "than max_price"
            ),
        )

    # -------------------------------------------------
    # Build MongoDB query
    # -------------------------------------------------

    query: dict = {}

    if category is not None:
        # Keep category as the original DB field.
        # We only strip surrounding whitespace.
        query["category"] = category.strip()

    if min_price_paise is not None:
        query.setdefault(
            "price_paise",
            {},
        )["$gte"] = min_price_paise

    if max_price_paise is not None:
        query.setdefault(
            "price_paise",
            {},
        )["$lte"] = max_price_paise

    if available_only:
        query["is_available"] = True

    # -------------------------------------------------
    # Only fetch fields needed by the API
    # -------------------------------------------------

    projection = {
        "_id": 1,
        "name": 1,
        "description": 1,
        "category": 1,
        "price_paise": 1,
        "is_available": 1,
        "customization_groups": 1,
    }

    try:
        cursor = (
            request.app.state.db.menu_items
            .find(query, projection)
            .sort(
                [
                    ("category", 1),
                    ("name", 1),
                ]
            )
        )

        items = []

        for document in cursor:
            price_paise = document["price_paise"]

            items.append(
                MenuItemResponse(
                    id=str(document["_id"]),
                    name=document["name"],
                    description=document["description"],
                    category=document["category"],
                    price=price_paise / 100,
                    is_available=document["is_available"],
                    customization_groups=document.get(
                        "customization_groups", []
                    ),
                )
            )

        return MenuResponse(items=items)

    except PyMongoError:
        raise HTTPException(
            status_code=503,
            detail="Menu database is temporarily unavailable",
        )