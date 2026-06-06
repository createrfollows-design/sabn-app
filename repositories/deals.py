from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from models.entities import Deal


class DealRepository:
    """Repository for deal persistence and queries."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, deal: Deal) -> Deal:
        """Persist a new deal and return it with generated ID."""

        self.db.add(deal)
        self.db.flush()
        return deal

    def get(self, deal_id: int) -> Deal | None:
        """Return a deal by ID."""

        return self.db.get(Deal, deal_id)

    def list_recent(self, limit: int = 50) -> list[Deal]:
        """Return recent deals for the dashboard."""

        return list(self.db.scalars(select(Deal).order_by(desc(Deal.created_at)).limit(limit)))