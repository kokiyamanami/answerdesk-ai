import uuid

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID

from app.db.session import Base


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    bot_id = Column(UUID(as_uuid=True), ForeignKey("bots.id", ondelete="CASCADE"), nullable=False)
    session_token = Column(String(255), nullable=False, unique=True)
    channel = Column(String(50), nullable=False, default="public_web")
    started_at = Column(DateTime, nullable=False, default=func.now())
    last_message_at = Column(DateTime, nullable=False, default=func.now())
    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())


class Message(Base):
    __tablename__ = "messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    bot_id = Column(UUID(as_uuid=True), ForeignKey("bots.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(20), nullable=False)  # 'user' | 'assistant' | 'system'
    message_type = Column(String(30), nullable=False, default="normal")  # 'normal' | 'fallback'
    content = Column(Text, nullable=False)
    retrieval_score = Column(Numeric(8, 5), nullable=True)
    fallback_triggered = Column(Boolean, nullable=False, default=False)
    model_name = Column(String(100), nullable=True)
    created_at = Column(DateTime, nullable=False, default=func.now())


class MessageCitation(Base):
    __tablename__ = "message_citations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    message_id = Column(UUID(as_uuid=True), ForeignKey("messages.id", ondelete="CASCADE"), nullable=False)
    chunk_id = Column(UUID(as_uuid=True), ForeignKey("document_chunks.id", ondelete="CASCADE"), nullable=False)
    rank_order = Column(Integer, nullable=False)
    score = Column(Numeric(8, 5), nullable=True)
    created_at = Column(DateTime, nullable=False, default=func.now())
