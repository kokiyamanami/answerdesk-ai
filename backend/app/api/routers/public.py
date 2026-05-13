import secrets
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from uuid import UUID

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.bot import Bot
from app.models.conversation import Conversation, Message
from app.models.user import User

router = APIRouter(prefix="/public", tags=["public"])


# ---------- スキーマ ----------

class PublicBotResponse(BaseModel):
    chat_title: str
    icon_url: Optional[str]
    welcome_message: Optional[str]
    theme: Optional[dict]


class StartConversationResponse(BaseModel):
    conversation_id: str
    session_token: str


class PublicMessageRequest(BaseModel):
    conversation_id: str
    message: str


class CitationResponse(BaseModel):
    title: Optional[str]
    source_kind: str


class PublicMessageResponse(BaseModel):
    answer: str
    fallback: bool
    citations: list[CitationResponse]
    contact: Optional[dict] = None


# ---------- ヘルパー ----------

def _get_public_bot(slug: str, db: Session) -> Bot:
    bot = db.query(Bot).filter(Bot.public_slug == slug).first()
    if not bot:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail={"code": "bot_not_found", "message": "ページが見つかりませんでした。"})
    if not bot.is_public:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail={"code": "bot_not_public", "message": "このチャットは現在公開されていません。"})
    return bot


# ---------- エンドポイント ----------

@router.get("/bots/{slug}", response_model=PublicBotResponse)
def get_public_bot(slug: str, db: Session = Depends(get_db)):
    bot = _get_public_bot(slug, db)
    theme = None
    if bot.theme_preset:
        p = bot.theme_preset
        theme = {
            "code": p.code,
            "background_color": p.background_color,
            "button_color": p.button_color,
            "bubble_color": p.bubble_color,
            "text_color": p.text_color,
        }
    return PublicBotResponse(
        chat_title=bot.chat_title,
        icon_url=bot.icon_url,
        welcome_message=bot.welcome_message,
        theme=theme,
    )


@router.post("/bots/{slug}/conversations", response_model=StartConversationResponse,
             status_code=status.HTTP_201_CREATED)
def start_conversation(slug: str, db: Session = Depends(get_db)):
    bot = _get_public_bot(slug, db)
    token = secrets.token_urlsafe(32)
    conv = Conversation(
        bot_id=bot.id,
        session_token=token,
        channel="public_web",
        started_at=datetime.now(timezone.utc),
        last_message_at=datetime.now(timezone.utc),
    )
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return StartConversationResponse(conversation_id=str(conv.id), session_token=token)


@router.post("/bots/{slug}/messages", response_model=PublicMessageResponse)
def send_message(slug: str, body: PublicMessageRequest, db: Session = Depends(get_db)):
    from app.services.rag_service import answer_question, save_messages

    bot = _get_public_bot(slug, db)

    conv = db.query(Conversation).filter(
        Conversation.id == UUID(body.conversation_id),
        Conversation.bot_id == bot.id,
    ).first()
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail={"code": "conversation_not_found", "message": "会話が見つかりません。"})

    try:
        result = answer_question(bot=bot, question=body.message, db=db)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "chat_error", "message": "現在回答を生成できませんでした。時間をおいて再度お試しください。"},
        )

    save_messages(conversation=conv, bot=bot, question=body.message, rag_result=result, db=db)

    return PublicMessageResponse(
        answer=result["answer"],
        fallback=result["fallback"],
        citations=[CitationResponse(title=c["title"], source_kind=c["source_kind"])
                   for c in result.get("citations", [])],
        contact=result.get("contact"),
    )
