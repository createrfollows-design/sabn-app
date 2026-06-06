from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.dependencies import current_settings, db_session
from repositories.logs import AuditLogRepository
from repositories.users import UserRepository
from schemas.auth import AuthResponse, TelegramAuthRequest
from services.security import create_access_token, create_csrf_token
from services.telegram_auth import verify_telegram_init_data
from utils.config import Settings
from utils.enums import AuditAction

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/telegram", response_model=AuthResponse)
def telegram_auth(payload: TelegramAuthRequest, db: Session = Depends(db_session), settings: Settings = Depends(current_settings)) -> AuthResponse:
    """Verify Telegram initData and issue JWT plus CSRF token."""

    verified = verify_telegram_init_data(payload.init_data, settings.bot_token)
    telegram_user = verified.get("user") or {}
    telegram_id = int(telegram_user["id"])
    username = telegram_user.get("username") or f"user_{telegram_id}"
    user = UserRepository(db).upsert_from_telegram(
        telegram_id=telegram_id,
        username=username,
        first_name=telegram_user.get("first_name"),
        is_admin=telegram_id == settings.admin_telegram_id,
    )
    AuditLogRepository(db).write(AuditAction.LOGIN, actor_id=user.id)
    db.commit()
    csrf_token = create_csrf_token()
    access_token = create_access_token(settings, str(telegram_id), csrf_token, user.is_admin)
    return AuthResponse(access_token=access_token, csrf_token=csrf_token)