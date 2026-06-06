import json

from sqlalchemy.orm import Session

from models.entities import AuditLog
from utils.enums import AuditAction


class AuditLogRepository:
    """Repository that writes append-only security and business logs."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def write(self, action: AuditAction, actor_id: int | None = None, deal_id: int | None = None, **payload: object) -> AuditLog:
        """Persist an audit log record with a compact JSON payload."""

        log = AuditLog(actor_id=actor_id, deal_id=deal_id, action=action, payload=json.dumps(payload, ensure_ascii=False))
        self.db.add(log)
        self.db.flush()
        return log