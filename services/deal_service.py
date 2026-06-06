from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from models.entities import Deal, Review, User
from repositories.deals import DealRepository
from repositories.logs import AuditLogRepository
from repositories.reviews import ReviewRepository
from repositories.users import UserRepository
from schemas.deal import DealCreate, DealStatusUpdate
from schemas.review import ReviewCreate
from services.notification_service import NotificationService
from utils.enums import AuditAction, DealStatus
from utils.sanitizer import sanitize_text


class DealService:
    """Business rules for user deal actions and admin-only status changes."""

    def __init__(self, db: Session, notifications: NotificationService) -> None:
        self.db = db
        self.deals = DealRepository(db)
        self.users = UserRepository(db)
        self.logs = AuditLogRepository(db)
        self.reviews = ReviewRepository(db)
        self.notifications = notifications

    def create_deal(self, actor: User, dto: DealCreate) -> Deal:
        """Create a deal unless the actor is banned; no auto-verification is performed."""

        if actor.is_banned:
            self.logs.write(AuditAction.BLOCK_BYPASS_ATTEMPT, actor_id=actor.id, reason=actor.ban_reason)
            self.db.commit()
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is banned")

        deal = Deal(
            creator_id=actor.id,
            seller_username=dto.seller_username,
            buyer_username=f"@{actor.username}",
            asset_link=dto.asset_link,
            price_stars=dto.price_stars,
            comment=dto.comment,
        )
        self.deals.create(deal)
        self.logs.write(AuditAction.DEAL_CREATED, actor_id=actor.id, deal_id=deal.id)
        self.db.commit()
        self.notifications.deal_created(deal)
        return deal

    def update_statuses(self, admin: User, deal_id: int, dto: DealStatusUpdate) -> Deal:
        """Update NFT, payment, or deal status from the admin panel only."""

        deal = self._get_deal_or_404(deal_id)
        if dto.nft_status is not None:
            deal.nft_status = dto.nft_status
        if dto.payment_status is not None:
            deal.payment_status = dto.payment_status
        if dto.deal_status is not None:
            deal.deal_status = dto.deal_status
        self.logs.write(AuditAction.DEAL_UPDATED, actor_id=admin.id, deal_id=deal.id, payload=dto.model_dump(mode="json"))
        self.db.commit()
        return deal

    def force_close(self, admin: User, deal_id: int, status_value: DealStatus) -> Deal:
        """Force a deal status regardless of its current lifecycle state."""

        deal = self._get_deal_or_404(deal_id)
        deal.deal_status = status_value
        self.logs.write(AuditAction.FORCE_CLOSE, actor_id=admin.id, deal_id=deal.id, status=status_value.value)
        self.db.commit()
        return deal

    def open_dispute(self, actor: User, deal_id: int, reason: str) -> Deal:
        """Open a dispute and notify the administrator for manual resolution."""

        deal = self._get_deal_or_404(deal_id)
        deal.deal_status = DealStatus.DISPUTE
        self.logs.write(AuditAction.DISPUTE_OPENED, actor_id=actor.id, deal_id=deal.id, reason=sanitize_text(reason, 500))
        self.db.commit()
        self.notifications.dispute_opened(deal)
        return deal

    def add_review(self, actor: User, deal_id: int, dto: ReviewCreate) -> Review:
        """Create a review only after a deal has been completed."""

        deal = self._get_deal_or_404(deal_id)
        if deal.deal_status != DealStatus.COMPLETED:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Deal is not completed")
        review = Review(deal_id=deal.id, author_id=actor.id, rating=dto.rating, text=dto.text)
        self.reviews.create(review)
        self.logs.write(AuditAction.REVIEW_CREATED, actor_id=actor.id, deal_id=deal.id)
        self.db.commit()
        self.notifications.review_created(review)
        return review

    def _get_deal_or_404(self, deal_id: int) -> Deal:
        """Return deal or raise a consistent 404 API error."""

        deal = self.deals.get(deal_id)
        if not deal:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deal not found")
        return deal