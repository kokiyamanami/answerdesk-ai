from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.bot import Bot
from app.models.conversation import Conversation, Message
from app.models.user import User

router = APIRouter(prefix="/conversations", tags=["conversation"])


class ConversationSummaryResponse(BaseModel):
    id: str
    started_at: str
    last_message_at: str
    latest_user_message: Optional[str]
    latest_assistant_message: Optional[str]
    fallback_triggered: bool


@router.get("", response_model=list[ConversationSummaryResponse])
def list_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    bot = db.query(Bot).filter(Bot.user_id == current_user.id).first()
    if not bot:
        return []

    convs = (
        db.query(Conversation)
        .filter(Conversation.bot_id == bot.id)
        .order_by(Conversation.last_message_at.desc())
        .limit(100)
        .all()
    )

    result = []
    for conv in convs:
        messages = (
            db.query(Message)
            .filter(Message.conversation_id == conv.id)
            .order_by(Message.created_at.desc())
            .limit(10)
            .all()
        )
        latest_user = next((m.content for m in messages if m.role == "user"), None)
        latest_ai = next((m.content for m in messages if m.role == "assistant"), None)
        fallback = any(m.fallback_triggered for m in messages if m.role == "assistant")

        result.append(ConversationSummaryResponse(
            id=str(conv.id),
            started_at=conv.started_at.isoformat() + 'Z',
            last_message_at=conv.last_message_at.isoformat() + 'Z',
            latest_user_message=latest_user,
            latest_assistant_message=latest_ai,
            fallback_triggered=fallback,
        ))

    return result
