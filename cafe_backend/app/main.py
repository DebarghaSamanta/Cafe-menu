from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from pymongo.errors import PyMongoError

from app.db.mongodb import (
    create_mongo_client,
    ensure_database_structure,
    get_database,
)
from app.routers.orders import (
    router as orders_router,
)
from app.routers.menu import router as menu_router
from app.routers.tables import router as tables_router
from app.schemas.models import HealthResponse

from fastapi.middleware.cors import CORSMiddleware
@asynccontextmanager
async def lifespan(app: FastAPI):
    client = create_mongo_client()

    try:
        client.admin.command("ping")

        db = get_database(client)

        ensure_database_structure(db)

        app.state.mongo_client = client
        app.state.db = db

        yield

    finally:
        client.close()


app = FastAPI(
    title="Digital Cafe Backend",
    version="0.3.0",
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
# =========================================================

app.include_router(tables_router)
app.include_router(menu_router)
app.include_router(orders_router)

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