from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pymongo.errors import PyMongoError

from app.db.mongodb import (
    create_mongo_client,
    ensure_database_structure,
    get_database,
)
from app.routers.orders import router as orders_router
from app.routers.menu import router as menu_router
from app.routers.tables import router as tables_router
from app.routers.auth import router as auth_router
from app.routers.admin import router as admin_router

from app.schemas.models import HealthResponse


import asyncio

async def _order_expiry_background_task(app: FastAPI):
    """
    Background worker loop that runs every 60 seconds to automatically cancel
    unpaid pending orders older than 30 minutes and restore inventory stock.
    """
    while True:
        try:
            await asyncio.sleep(60)
            db = getattr(app.state, "db", None)
            if db is not None:
                from app.services.order_admin_service import auto_cancel_unpaid_pending_orders
                auto_cancel_unpaid_pending_orders(db, timeout_minutes=30)
        except asyncio.CancelledError:
            break
        except Exception:
            pass


@asynccontextmanager
async def lifespan(app: FastAPI):
    client = create_mongo_client()

    try:
        client.admin.command("ping")

        db = get_database(client)

        ensure_database_structure(db)

        app.state.mongo_client = client
        app.state.db = db

        # Start periodic 30-min unpaid order auto-cancel worker
        expiry_task = asyncio.create_task(_order_expiry_background_task(app))

        yield

        expiry_task.cancel()
        try:
            await expiry_task
        except asyncio.CancelledError:
            pass

    finally:
        client.close()


app = FastAPI(
    title="Digital Cafe Backend",
    version="0.4.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================================================
# ROUTERS
#
# Admin sub-routers (menu, orders, staff, tables) are all
# registered inside app.routers.admin and inherit its
# /api/admin prefix + require_admin guard.
# =========================================================

app.include_router(tables_router)
app.include_router(menu_router)
app.include_router(orders_router)
app.include_router(auth_router)
app.include_router(admin_router)

# =========================================================
# HEALTH
# =========================================================

@app.get(
    "/health",
    response_model=HealthResponse,
)
def health(request: Request):
    try:
        request.app.state.mongo_client.admin.command("ping")

        return HealthResponse(
            status="ok",
            database="connected",
        )

    except PyMongoError:
        return JSONResponse(
            status_code=503,
            content={
                "status": "error",
                "database": "disconnected",
            },
        )