import uuid

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import UUID

from app.db.session import Base


class BotTestQuestion(Base):
    """公開前の精度確認用に登録しておくテスト質問と、直近の実行結果。"""

    __tablename__ = "bot_test_questions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    bot_id = Column(UUID(as_uuid=True), ForeignKey("bots.id", ondelete="CASCADE"), nullable=False)
    question = Column(Text, nullable=False)
    note = Column(Text, nullable=True)

    last_answer = Column(Text, nullable=True)
    last_fallback = Column(Boolean, nullable=True)
    last_score = Column(Float, nullable=True)
    last_run_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())
