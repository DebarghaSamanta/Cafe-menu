from fastapi import APIRouter, Depends

from app.security import require_admin
from app.routers.admin_menu import router as admin_menu_router


router = APIRouter(
    prefix="/api/admin",
    tags=["Admin"],
    dependencies=[
        Depends(require_admin)
    ],
)


@router.get("/me")
def get_admin_profile(
    current_user: dict = Depends(require_admin),
):
    """
    Return the currently authenticated Admin.
    """

    return {
        "message": "Admin authentication successful",
        "user": current_user,
    }


router.include_router(
    admin_menu_router
)