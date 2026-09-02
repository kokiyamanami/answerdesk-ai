import uuid

from sqlalchemy import Column, DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID

from app.db.session import Base

ROLE_OWNER = "owner"
ROLE_EDITOR = "editor"
VALID_ROLES = {ROLE_OWNER, ROLE_EDITOR}


class BotMember(Base):
    """ボットを編集できるユーザー。owner はメンバー管理も可能、editor は内容編集のみ。"""

    __tablename__ = "bot_members"
    __table_args__ = (UniqueConstraint("bot_id", "user_id", name="uq_bot_members_bot_user"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    bot_id = Column(UUID(as_uuid=True), ForeignKey("bots.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(20), nullable=False, default=ROLE_EDITOR)
    created_at = Column(DateTime, nullable=False, default=func.now())
