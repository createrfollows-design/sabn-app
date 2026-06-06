from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from models.entities import User, Violation


class UserRepository:
    """Repository for Telegram users and ban state."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_telegram_id(self, telegram_id: int) -> User | None:
        """Find a user by Telegram ID."""

        return self.db.scalar(select(User).where(User.telegram_id == telegram_id))

    def upsert_from_telegram(self, telegram_id: int, username: str, first_name: str | None, is_admin: bool) -> User:
        """Create or update a user from verified Telegram initData."""

        user = self.get_by_telegram_id(telegram_id)
        if not user:
            user = User(telegram_id=telegram_id, username=username, first_name=first_name, is_admin=is_admin)
            self.db.add(user)
        else:
            user.username = username
            user.first_name = first_name
            user.is_admin = is_admin
        user.last_login_at = datetime.now(timezone.utc)
        self.db.flush()
        return user

    def set_ban(self, user: User, is_banned: bool, reason: str | None = None) -> User:
        """Update ban state and append a violation when a ban is set."""

        user.is_banned = is_banned
        user.ban_reason = reason if is_banned else None
        if is_banned and reason:
            self.db.add(Violation(user_id=user.id, reason=reason))
        self.db.flush()
        return user

    def list_violations(self, user: User) -> list[Violation]:
        """Return all stored violations for a user."""

        return list(self.db.scalars(select(Violation).where(Violation.user_id == user.id).order_by(Violation.created_at.desc())))