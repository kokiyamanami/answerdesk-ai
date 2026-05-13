import uuid

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.session import Base


class Bot(Base):
    __tablename__ = "bots"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    name = Column(String(255), nullable=False)
    public_slug = Column(String(50), nullable=False, unique=True)
    is_public = Column(Boolean, nullable=False, default=False)
    chat_title = Column(String(255), nullable=False)
    icon_url = Column(Text, nullable=True)
    welcome_message = Column(Text, nullable=True)
    theme_preset_id = Column(UUID(as_uuid=True), ForeignKey("theme_presets.id", ondelete="SET NULL"), nullable=True)
    fallback_enabled = Column(Boolean, nullable=False, default=True)
    fallback_message = Column(Text, nullable=False, default="申し訳ありませんが、お答えできませんでした。お問い合わせください。")
    fallback_contact_url = Column(Text, nullable=True)
    fallback_contact_email = Column(String(255), nullable=True)
    rag_score_threshold = Column("rag_score_threshold", __import__('sqlalchemy').Float, nullable=False, default=0.5)
    ai_model = Column(String(50), nullable=False, default="gpt-4.1-mini")
    status = Column(String(50), nullable=False, default="active")
    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())

    user = relationship("User", backref="bot")
    theme_preset = relationship("ThemePreset")
