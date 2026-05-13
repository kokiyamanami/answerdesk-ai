from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.bot import Bot
from app.models.document_chunk import DocumentChunk
from app.models.faq import FAQ
from app.models.user import User
from app.services.embedding_service import generate_embedding

router = APIRouter(prefix="/faqs", tags=["faq"])


class FAQResponse(BaseModel):
    id: str
    question: str
    answer: str
    category: Optional[str]
    sort_order: int
    is_active: bool

    model_config = {"from_attributes": True}


class FAQCreateRequest(BaseModel):
    question: str
    answer: str
    category: Optional[str] = None
    sort_order: int = 0


class FAQUpdateRequest(BaseModel):
    question: Optional[str] = None
    answer: Optional[str] = None
    category: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


def _get_bot_or_404(current_user: User, db: Session) -> Bot:
    bot = db.query(Bot).filter(Bot.user_id == current_user.id).first()
    if not bot:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail={"code": "bot_not_found", "message": "ボットが見つかりません。"})
    return bot


def _sync_faq_chunk(faq: FAQ, db: Session) -> None:
    """FAQのdocument_chunkを更新する（既存を無効化して再生成）。"""
    db.query(DocumentChunk).filter(
        DocumentChunk.source_kind == "faq",
        DocumentChunk.source_id == faq.id,
    ).update({"is_active": False})
    db.flush()

    content = f"質問: {faq.question}\n回答: {faq.answer}"
    title_prefix = f"FAQ: {faq.category} / " if faq.category else "FAQ: "
    title = f"{title_prefix}{faq.question}"

    embedding = generate_embedding(content)

    chunk = DocumentChunk(
        bot_id=faq.bot_id,
        source_kind="faq",
        source_id=faq.id,
        chunk_index=0,
        title=title,
        content=content,
        metadata_json={"category": faq.category},
        embedding=embedding,
        is_active=True,
    )
    db.add(chunk)


@router.get("", response_model=list[FAQResponse])
def list_faqs(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    bot = _get_bot_or_404(current_user, db)
    faqs = (
        db.query(FAQ)
        .filter(FAQ.bot_id == bot.id, FAQ.is_active == True)
        .order_by(FAQ.sort_order, FAQ.created_at)
        .all()
    )
    return [FAQResponse(id=str(f.id), question=f.question, answer=f.answer,
                        category=f.category, sort_order=f.sort_order, is_active=f.is_active)
            for f in faqs]


@router.post("", response_model=FAQResponse, status_code=status.HTTP_201_CREATED)
def create_faq(body: FAQCreateRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    bot = _get_bot_or_404(current_user, db)
    faq = FAQ(bot_id=bot.id, question=body.question, answer=body.answer,
               category=body.category, sort_order=body.sort_order)
    db.add(faq)
    db.flush()
    _sync_faq_chunk(faq, db)
    db.commit()
    db.refresh(faq)
    return FAQResponse(id=str(faq.id), question=faq.question, answer=faq.answer,
                       category=faq.category, sort_order=faq.sort_order, is_active=faq.is_active)


@router.patch("/{faq_id}", response_model=FAQResponse)
def update_faq(faq_id: str, body: FAQUpdateRequest,
               current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    bot = _get_bot_or_404(current_user, db)
    faq = db.query(FAQ).filter(FAQ.id == UUID(faq_id), FAQ.bot_id == bot.id).first()
    if not faq:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail={"code": "faq_not_found", "message": "FAQが見つかりません。"})

    for key, value in body.model_dump(exclude_none=True).items():
        setattr(faq, key, value)
    db.flush()

    _sync_faq_chunk(faq, db)
    db.commit()
    db.refresh(faq)
    return FAQResponse(id=str(faq.id), question=faq.question, answer=faq.answer,
                       category=faq.category, sort_order=faq.sort_order, is_active=faq.is_active)


@router.delete("/{faq_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_faq(faq_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    bot = _get_bot_or_404(current_user, db)
    faq = db.query(FAQ).filter(FAQ.id == UUID(faq_id), FAQ.bot_id == bot.id).first()
    if not faq:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail={"code": "faq_not_found", "message": "FAQが見つかりません。"})
    db.query(DocumentChunk).filter(
        DocumentChunk.source_kind == "faq",
        DocumentChunk.source_id == faq.id,
    ).delete()
    db.delete(faq)
    db.commit()
