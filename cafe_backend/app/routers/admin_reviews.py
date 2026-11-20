from fastapi import APIRouter, HTTPException, Request, Depends
from pymongo.errors import PyMongoError

from app.security import require_admin
from app.schemas.review import ReviewUpdate

router = APIRouter(
    prefix="/reviews",
    tags=["Admin Reviews"],
)


@router.get("")
def get_all_reviews(request: Request, current_user: dict = Depends(require_admin)):
    """
    List all customer reviews for administration and moderation.
    """
    try:
        db = request.app.state.db
        cursor = db.reviews.find().sort("created_at", -1)

        reviews = []
        total_rating = 0
        approved_count = 0

        for doc in cursor:
            rating = doc.get("rating", 5)
            is_approved = doc.get("is_approved", True)
            total_rating += rating
            if is_approved:
                approved_count += 1

            reviews.append({
                "id": str(doc.get("_id")),
                "customer_name": doc.get("customer_name", "Anonymous Guest"),
                "table_number": doc.get("table_number"),
                "rating": rating,
                "comment": doc.get("comment", ""),
                "is_approved": is_approved,
                "is_featured": doc.get("is_featured", False),
                "created_at": doc.get("created_at", ""),
            })

        count = len(reviews)
        avg_rating = round(total_rating / count, 1) if count > 0 else 5.0

        return {
            "reviews": reviews,
            "metrics": {
                "total_count": count,
                "approved_count": approved_count,
                "average_rating": avg_rating
            }
        }

    except PyMongoError as exc:
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve reviews from database."
        ) from exc


@router.patch("/{review_id}")
def update_review_status(
    review_id: str,
    payload: ReviewUpdate,
    request: Request,
    current_user: dict = Depends(require_admin)
):
    """
    Toggle approval or featured status of a review.
    """
    try:
        db = request.app.state.db
        update_fields = {}
        if payload.is_approved is not None:
            update_fields["is_approved"] = payload.is_approved
        if payload.is_featured is not None:
            update_fields["is_featured"] = payload.is_featured

        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields provided to update.")

        result = db.reviews.update_one({"_id": review_id}, {"$set": update_fields})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Review not found.")

        updated_doc = db.reviews.find_one({"_id": review_id})
        return {
            "message": "Review status updated successfully.",
            "review": {
                "id": str(updated_doc["_id"]),
                **updated_doc
            }
        }

    except PyMongoError as exc:
        raise HTTPException(status_code=500, detail="Database update error.") from exc


@router.delete("/{review_id}")
def delete_review(
    review_id: str,
    request: Request,
    current_user: dict = Depends(require_admin)
):
    """
    Permanently delete an inappropriate or spam review.
    """
    try:
        db = request.app.state.db
        result = db.reviews.delete_one({"_id": review_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Review not found.")

        return {"message": "Review deleted successfully."}

    except PyMongoError as exc:
        raise HTTPException(status_code=500, detail="Database deletion error.") from exc
