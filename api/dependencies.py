from collections.abc import Generator

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from database.session import get_db
from models.entities import User
from repositories.users import UserRepository
from services.security import decode_access_token, extract_bearer_token
from utils.config import Settings, get_settings


def db_session() -> Generator[Session, None, None]:
    """Expose the database session dependency to routers."""

    yield from get_db()


def current_settings() -> Settings:
    """Expose cached application settings to routers."""

    return get_settings()


def current_user(
    request: Request,
    db: Session = Depends(db_session),
    settings: Settings = Depends(current_settings),
) -> User:
    """Resolve the authenticated Mini App user from the JWT subject."""

    payload = decode_access_token(settings, extract_bearer_token(request))
    user = UserRepository(db).get_by_telegram_id(int(payload["sub"]))
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    request.state.jwt_payload = payload
    return user


def admin_user(user: User = Depends(current_user), settings: Settings = Depends(current_settings)) -> User:
    """Allow access only to the configured Telegram administrator."""

    if not user.is_admin or user.telegram_id != settings.admin_telegram_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user