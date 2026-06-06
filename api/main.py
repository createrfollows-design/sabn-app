from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database.session import init_db
from routers import admin, auth, deals, reviews
from services.rate_limit import InMemoryRateLimitMiddleware
from utils.config import get_settings

settings = get_settings()

app = FastAPI(
    title="Secure Assets Bridge Node API",
    description="Manual escrow API for Telegram NFT, Gifts, and Stars deals.",
    version="1.0.0",
)

app.add_middleware(InMemoryRateLimitMiddleware, limit_per_minute=settings.rate_limit_per_minute)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.public_base_url, "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH"],
    allow_headers=["Authorization", "Content-Type", settings.csrf_header_name],
)

app.include_router(auth.router)
app.include_router(deals.router)
app.include_router(reviews.router)
app.include_router(admin.router)


@app.on_event("startup")
def on_startup() -> None:
    """Initialize SQLite tables when the API starts."""

    init_db()


@app.get("/health")
def health() -> dict[str, str]:
    """Expose a simple health endpoint for uptime checks."""

    return {"status": "ok", "system": settings.app_name}