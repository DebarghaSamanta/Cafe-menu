from fastapi import APIRouter, Depends

from app.security import require_admin
from app.routers.admin_menu import router as admin_menu_router
from app.routers.admin_orders import router as admin_orders_router
from app.routers.admin_staff import router as admin_staff_router
from app.routers.admin_tables import router as admin_tables_router
from app.routers.admin_dashboard import router as admin_dashboard_router


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
    Return the currently authenticated Admin's profile.
    """

    return {
        "message": "Admin authentication successful",
        "user": current_user,
    }


# =========================================================
# Mount sub-routers
# Each inherits the /api/admin prefix and auth guard.
# =========================================================

router.include_router(admin_menu_router)
router.include_router(admin_orders_router)
router.include_router(admin_staff_router)
router.include_router(admin_tables_router)
router.include_router(admin_dashboard_router)