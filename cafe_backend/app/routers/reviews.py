import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Request
from pymongo.errors import PyMongoError

from app.schemas.review import ReviewCreate, ReviewResponse

router = APIRouter(
    prefix="/api/reviews",
    tags=["Reviews"],
)


@router.get("/public")
def get_public_reviews(request: Request):
    """
    Get all approved & featured customer reviews for the public landing page.
    """
    try:
        db = request.app.state.db
        cursor = db.reviews.find(
            {"is_approved": True}
        ).sort("created_at", -1).limit(12)

        reviews = []
        for doc in cursor:
            reviews.append({
                "id": str(doc.get("_id")),
                "customer_name": doc.get("customer_name", "Anonymous Guest"),
                "table_number": doc.get("table_number"),
                "rating": doc.get("rating", 5),
                "comment": doc.get("comment", ""),
                "is_approved": doc.get("is_approved", True),
                "is_featured": doc.get("is_featured", True),
                "created_at": doc.get("created_at", datetime.now(timezone.utc).isoformat()),
            })

        return reviews

    except PyMongoError as exc:
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve reviews from database."
        ) from exc


@router.post("", status_code=201)
def submit_customer_review(request: Request, payload: ReviewCreate):
    """
    Submit a customer experience review from table or catalogue.
    """
    try:
        db = request.app.state.db
        review_id = f"rev-{int(datetime.now(timezone.utc).timestamp())}-{uuid.uuid4().hex[:6]}"
        
        review_doc = {
            "_id": review_id,
            "customer_name": payload.customer_name.strip() if payload.customer_name else "Valued Guest",
            "table_number": payload.table_number,
            "rating": payload.rating,
            "comment": payload.comment.strip(),
            "is_approved": True,  # Auto-approved by default so guests see immediate impact
            "is_featured": payload.rating >= 4,  # Automatically marked featured if 4 or 5 stars
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        db.reviews.insert_one(review_doc)

        return {
            "message": "Thank you for your valuable feedback!",
            "review": {
                "id": review_id,
                **review_doc
            }
        }

    except PyMongoError as exc:
        raise HTTPException(
            status_code=500,
            detail="Failed to submit your review. Please try again."
        ) from exc
