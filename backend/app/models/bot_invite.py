import uuid

from sqlalchemy import Column, DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID

from app.db.session import Base


class BotInvite(Base):
    """まだ登録していないメール宛のボット招待。登録/ログイン時に bot_members へ変換される。"""

    __tablename__ = "bot_invites"
    __table_args__ = (UniqueConstraint("bot_id", "email", name="uq_bot_invites_bot_email"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    bot_id = Column(UUID(as_uuid=True), ForeignKey("bots.id", ondelete="CASCADE"), nullable=False)
    email = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="editor")
    invited_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, nullable=False, default=func.now())
