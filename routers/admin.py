from fastapi import APIRouter, Depends, Header, Request
from sqlalchemy.orm import Session

from api.dependencies import admin_user, current_settings, db_session
from models.entities import User
from repositories.users import UserRepository
from schemas.deal import DealOut, DealStatusUpdate
from services.deal_service import DealService
from services.notification_service import NotificationService
from services.security import assert_csrf
from utils.config import Settings
from utils.enums import AuditAction, DealStatus
from repositories.logs import AuditLogRepository

router = APIRouter(prefix="/admin", tags=["admin"])


@router.patch("/deals/{deal_id}", response_model=DealOut)
def update_deal_statuses(
    deal_id: int,
    dto: DealStatusUpdate,
    request: Request,
    csrf: str | None = Header(default=None, alias="X-CSRF-Token"),
    db: Session = Depends(db_session),
    admin: User = Depends(admin_user),
    settings: Settings = Depends(current_settings),
) -> DealOut:
    """Admin-only endpoint for manual NFT, payment, and deal status changes."""

    assert_csrf(request.state.jwt_payload, csrf)
    return DealService(db, NotificationService(settings)).update_statuses(admin, deal_id, dto)


@router.post("/force_close/{deal_id}/{status_value}", response_model=DealOut)
def force_close(
    deal_id: int,
    status_value: DealStatus,
    request: Request,
    csrf: str | None = Header(default=None, alias="X-CSRF-Token"),
    db: Session = Depends(db_session),
    admin: User = Depends(admin_user),
    settings: Settings = Depends(current_settings),
) -> DealOut:
    """Force a deal into any final or active status independently of current state."""

    assert_csrf(request.state.jwt_payload, csrf)
    return DealService(db, NotificationService(settings)).force_close(admin, deal_id, status_value)


@router.post("/users/{telegram_id}/ban")
def ban_user(
    telegram_id: int,
    request: Request,
    reason: str = "Manual admin block",
    csrf: str | None = Header(default=None, alias="X-CSRF-Token"),
    db: Session = Depends(db_session),
    admin: User = Depends(admin_user),
    settings: Settings = Depends(current_settings),
) -> dict[str, str]:
    """Ban a user, store the reason, and alert the administrator."""

    assert_csrf(request.state.jwt_payload, csrf)
    repo = UserRepository(db)
    user = repo.get_by_telegram_id(telegram_id)
    if not user:
        return {"status": "not_found"}
    repo.set_ban(user, True, reason)
    AuditLogRepository(db).write(AuditAction.USER_BANNED, actor_id=admin.id, reason=reason)
    db.commit()
    NotificationService(settings).ban_event(user, True)
    return {"status": "banned"}


@router.post("/users/{telegram_id}/unban")
def unban_user(
    telegram_id: int,
    request: Request,
    csrf: str | None = Header(default=None, alias="X-CSRF-Token"),
    db: Session = Depends(db_session),
    admin: User = Depends(admin_user),
    settings: Settings = Depends(current_settings),
) -> dict[str, str]:
    """Unban a user and log the administrator action."""

    assert_csrf(request.state.jwt_payload, csrf)
    repo = UserRepository(db)
    user = repo.get_by_telegram_id(telegram_id)
    if not user:
        return {"status": "not_found"}
    repo.set_ban(user, False)
    AuditLogRepository(db).write(AuditAction.USER_UNBANNED, actor_id=admin.id)
    db.commit()
    NotificationService(settings).ban_event(user, False)
    return {"status": "unbanned"}


@router.get("/users/{telegram_id}/violations")
def user_violations(
    telegram_id: int,
    db: Session = Depends(db_session),
    _admin: User = Depends(admin_user),
) -> dict[str, object]:
    """Return current ban reason and full violation history for admin review."""

    repo = UserRepository(db)
    user = repo.get_by_telegram_id(telegram_id)
    if not user:
        return {"status": "not_found", "violations": []}
    violations = repo.list_violations(user)
    return {
        "status": "ok",
        "is_banned": user.is_banned,
        "ban_reason": user.ban_reason,
        "violations": [{"reason": item.reason, "created_at": item.created_at.isoformat()} for item in violations],
    }