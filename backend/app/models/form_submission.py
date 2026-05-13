import uuid

from sqlalchemy import Column, DateTime, ForeignKey, JSON, func
from sqlalchemy.dialects.postgresql import UUID

from app.db.session import Base


class FormSubmission(Base):
    __tablename__ = "form_submissions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    bot_id = Column(UUID(as_uuid=True), ForeignKey("bots.id", ondelete="CASCADE"), nullable=False)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="SET NULL"), nullable=True)
    data = Column(JSON, nullable=False)
    submitted_at = Column(DateTime, nullable=False, default=func.now())
