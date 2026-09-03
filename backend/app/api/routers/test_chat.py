import secrets
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Header, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_user_bot
from app.db.session import get_db
from app.models.bot import Bot
from app.models.conversation import Conversation
from app.models.user import User
from app.services.rag_service import answer_question, save_messages

router = APIRouter(prefix="/test-chat", tags=["test-chat"])


class TestChatRequest(BaseModel):
    message: str


class CitationResponse(BaseModel):
    chunk_id: str
    title: Optional[str]
    source_kind: str


class TestChatResponse(BaseModel):
    answer: str
    fallback: bool
    citations: list[CitationResponse]
    contact: Optional[dict] = None


@router.post("/messages", response_model=TestChatResponse)
def test_chat(
    body: TestChatRequest,
    current_user: User = Depends(get_current_user),
    x_bot_id: str | None = Header(None, alias="X-Bot-Id"),
    db: Session = Depends(get_db),
):
    bot = get_user_bot(current_user, db, x_bot_id)

    # テストチャット用の一時会話セッション（毎回新規）
    conv = Conversation(
        bot_id=bot.id,
        session_token=secrets.token_urlsafe(32),
        channel="admin_test",
        started_at=datetime.now(timezone.utc),
        last_message_at=datetime.now(timezone.utc),
    )
    db.add(conv)
    db.flush()

    try:
        result = answer_question(bot=bot, question=body.message, db=db)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "chat_error", "message": "現在回答を生成できませんでした。時間をおいて再度お試しください。"},
        )

    save_messages(conversation=conv, bot=bot, question=body.message, rag_result=result, db=db)

    return TestChatResponse(
        answer=result["answer"],
        fallback=result["fallback"],
        citations=[CitationResponse(chunk_id=c["chunk_id"], title=c["title"], source_kind=c["source_kind"])
                   for c in result.get("citations", [])],
        contact=result.get("contact"),
    )
