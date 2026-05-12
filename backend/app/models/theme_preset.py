import uuid

from sqlalchemy import Boolean, Column, DateTime, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID

from app.db.session import Base


class ThemePreset(Base):
    __tablename__ = "theme_presets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(50), nullable=False, unique=True)
    name = Column(String(100), nullable=False)
    background_color = Column(String(7), nullable=False)
    button_color = Column(String(7), nullable=False)
    bubble_color = Column(String(7), nullable=False)
    text_color = Column(String(7), nullable=False)
    muted_text_color = Column(String(7), nullable=True)
    border_color = Column(String(7), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    sort_order = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())
