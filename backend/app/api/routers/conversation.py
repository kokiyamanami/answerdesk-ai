from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, find_user_bot, get_user_bot
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
    message_count: int


class MessageResponse(BaseModel):
    id: str
    role: str
    content: str
    fallback_triggered: bool
    created_at: str


class ConversationDetailResponse(BaseModel):
    id: str
    started_at: str
    last_message_at: str
    messages: list[MessageResponse]


@router.get("", response_model=list[ConversationSummaryResponse])
def list_conversations(
    current_user: User = Depends(get_current_user),
    x_bot_id: str | None = Header(None, alias="X-Bot-Id"),
    db: Session = Depends(get_db),
):
    bot = find_user_bot(current_user, db, x_bot_id)
    if not bot:
        return []

    convs = (
        db.query(Conversation)
        .filter(Conversation.bot_id == bot.id)
        .order_by(Conversation.last_message_at.desc())
        .limit(100)
        .all()
    )

    counts = dict(
        db.query(Message.conversation_id, func.count(Message.id))
        .filter(Message.conversation_id.in_([c.id for c in convs]))
        .group_by(Message.conversation_id)
        .all()
    ) if convs else {}

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
            message_count=int(counts.get(conv.id, 0)),
        ))

    return result


@router.get("/{conversation_id}", response_model=ConversationDetailResponse)
def get_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    x_bot_id: str | None = Header(None, alias="X-Bot-Id"),
    db: Session = Depends(get_db),
):
    bot = get_user_bot(current_user, db, x_bot_id)
    try:
        cid = UUID(conversation_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail={"code": "not_found", "message": "会話が見つかりません。"})
    conv = db.query(Conversation).filter(
        Conversation.id == cid, Conversation.bot_id == bot.id).first()
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail={"code": "not_found", "message": "会話が見つかりません。"})
    messages = (
        db.query(Message)
        .filter(Message.conversation_id == conv.id)
        .order_by(Message.created_at)
        .all()
    )
    return ConversationDetailResponse(
        id=str(conv.id),
        started_at=conv.started_at.isoformat() + 'Z',
        last_message_at=conv.last_message_at.isoformat() + 'Z',
        messages=[
            MessageResponse(
                id=str(m.id), role=m.role, content=m.content,
                fallback_triggered=m.fallback_triggered,
                created_at=m.created_at.isoformat() + 'Z',
            )
            for m in messages
        ],
    )
