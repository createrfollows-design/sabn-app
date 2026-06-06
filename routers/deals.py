from fastapi import APIRouter, Depends, Header, Request
from sqlalchemy.orm import Session

from api.dependencies import current_settings, current_user, db_session
from models.entities import User
from repositories.deals import DealRepository
from schemas.deal import DealCreate, DealOut
from services.deal_service import DealService
from services.notification_service import NotificationService
from services.security import assert_csrf
from utils.config import Settings

router = APIRouter(prefix="/deals", tags=["deals"])


@router.get("", response_model=list[DealOut])
def list_deals(db: Session = Depends(db_session), _user: User = Depends(current_user)) -> list[DealOut]:
    """Return recent deals for the Mini App dashboard."""

    return DealRepository(db).list_recent()


@router.post("", response_model=DealOut)
def create_deal(
    dto: DealCreate,
    request: Request,
    csrf: str | None = Header(default=None, alias="X-CSRF-Token"),
    db: Session = Depends(db_session),
    actor: User = Depends(current_user),
    settings: Settings = Depends(current_settings),
) -> DealOut:
    """Create a new deal and notify the admin; all checks stay manual."""

    assert_csrf(request.state.jwt_payload, csrf)
    return DealService(db, NotificationService(settings)).create_deal(actor, dto)


@router.post("/{deal_id}/dispute", response_model=DealOut)
def open_dispute(
    deal_id: int,
    request: Request,
    reason: str = "User opened dispute",
    csrf: str | None = Header(default=None, alias="X-CSRF-Token"),
    db: Session = Depends(db_session),
    actor: User = Depends(current_user),
    settings: Settings = Depends(current_settings),
) -> DealOut:
    """Allow a participant to open a dispute for manual admin decision."""

    assert_csrf(request.state.jwt_payload, csrf)
    return DealService(db, NotificationService(settings)).open_dispute(actor, deal_id, reason)