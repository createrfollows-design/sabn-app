from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables and .env."""

    app_env: str = "local"
    app_name: str = "SABN"
    public_base_url: str = "http://localhost:5173"
    database_url: str = "sqlite:///./sabn.sqlite3"
    bot_token: str = ""
    bot_username: str = "SABNWOK_bot"
    admin_telegram_id: int = Field(default=0)
    jwt_secret: str = Field(default="change-me-in-production")
    jwt_expire_minutes: int = 60 * 24
    csrf_header_name: str = "X-CSRF-Token"
    rate_limit_per_minute: int = 90

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance for dependency injection."""

    return Settings()