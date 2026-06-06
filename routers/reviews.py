from fastapi import APIRouter, Depends, Header, Request
from sqlalchemy.orm import Session

from api.dependencies import current_settings, current_user, db_session
from models.entities import User
from repositories.reviews import ReviewRepository
from schemas.review import ReviewCreate, ReviewOut
from services.deal_service import DealService
from services.notification_service import NotificationService
from services.security import assert_csrf
from utils.config import Settings

router = APIRouter(prefix="/reviews", tags=["reviews"])


@router.get("", response_model=list[ReviewOut])
def list_reviews(db: Session = Depends(db_session), _user: User = Depends(current_user)) -> list[ReviewOut]:
    """Return recent user reviews for profile and home screens."""

    return ReviewRepository(db).list_recent()


@router.post("/deals/{deal_id}", response_model=ReviewOut)
def create_review(
    deal_id: int,
    dto: ReviewCreate,
    request: Request,
    csrf: str | None = Header(default=None, alias="X-CSRF-Token"),
    db: Session = Depends(db_session),
    actor: User = Depends(current_user),
    settings: Settings = Depends(current_settings),
) -> ReviewOut:
    """Create a review after completion and notify the administrator."""

    assert_csrf(request.state.jwt_payload, csrf)
    return DealService(db, NotificationService(settings)).add_review(actor, deal_id, dto)