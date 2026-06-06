from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from models.entities import Review


class ReviewRepository:
    """Repository for review records."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, review: Review) -> Review:
        """Persist a review."""

        self.db.add(review)
        self.db.flush()
        return review

    def list_recent(self, limit: int = 100) -> list[Review]:
        """Return recent reviews for trust profiles."""

        return list(self.db.scalars(select(Review).order_by(desc(Review.created_at)).limit(limit)))