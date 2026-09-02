import logging
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.bot import Bot
from app.models.bot_test_question import BotTestQuestion
from app.models.user import User
from app.services.rag_service import answer_question

router = APIRouter(prefix="/test-questions", tags=["test-question"])
logger = logging.getLogger(__name__)


class TestQuestionResponse(BaseModel):
    id: str
    question: str
    note: Optional[str]
    last_answer: Optional[str]
    last_fallback: Optional[bool]
    last_score: Optional[float]
    last_run_at: Optional[datetime]

    model_config = {"from_attributes": True}


class TestQuestionCreateRequest(BaseModel):
    question: str
    note: Optional[str] = None


class TestQuestionUpdateRequest(BaseModel):
    question: Optional[str] = None
    note: Optional[str] = None


def _get_bot_or_404(current_user: User, db: Session) -> Bot:
    bot = db.query(Bot).filter(Bot.user_id == current_user.id).first()
    if not bot:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail={"code": "bot_not_found", "message": "ボットが見つかりません。"})
    return bot


def _to_response(q: BotTestQuestion) -> TestQuestionResponse:
    return TestQuestionResponse(
        id=str(q.id), question=q.question, note=q.note,
        last_answer=q.last_answer, last_fallback=q.last_fallback,
        last_score=q.last_score, last_run_at=q.last_run_at,
    )


@router.get("", response_model=list[TestQuestionResponse])
def list_test_questions(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    bot = _get_bot_or_404(current_user, db)
    rows = (
        db.query(BotTestQuestion)
        .filter(BotTestQuestion.bot_id == bot.id)
        .order_by(BotTestQuestion.created_at)
        .all()
    )
    return [_to_response(q) for q in rows]


@router.post("", response_model=TestQuestionResponse, status_code=status.HTTP_201_CREATED)
def create_test_question(body: TestQuestionCreateRequest,
                         current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    bot = _get_bot_or_404(current_user, db)
    question = body.question.strip()
    if not question:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail={"code": "question_required", "message": "質問を入力してください。"})
    q = BotTestQuestion(bot_id=bot.id, question=question, note=(body.note or "").strip() or None)
    db.add(q)
    db.commit()
    db.refresh(q)
    return _to_response(q)


@router.patch("/{question_id}", response_model=TestQuestionResponse)
def update_test_question(question_id: str, body: TestQuestionUpdateRequest,
                         current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    bot = _get_bot_or_404(current_user, db)
    q = db.query(BotTestQuestion).filter(
        BotTestQuestion.id == UUID(question_id), BotTestQuestion.bot_id == bot.id).first()
    if not q:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail={"code": "not_found", "message": "テスト質問が見つかりません。"})
    if body.question is not None:
        q.question = body.question.strip()
    if body.note is not None:
        q.note = body.note.strip() or None
    db.commit()
    db.refresh(q)
    return _to_response(q)


@router.delete("/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_test_question(question_id: str,
                         current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    bot = _get_bot_or_404(current_user, db)
    q = db.query(BotTestQuestion).filter(
        BotTestQuestion.id == UUID(question_id), BotTestQuestion.bot_id == bot.id).first()
    if not q:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail={"code": "not_found", "message": "テスト質問が見つかりません。"})
    db.delete(q)
    db.commit()


@router.post("/run", response_model=list[TestQuestionResponse])
def run_test_questions(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """登録済みの全テスト質問を RAG パイプラインに通し、直近結果を更新して返す。
    会話ログには保存しない。"""
    bot = _get_bot_or_404(current_user, db)
    rows = (
        db.query(BotTestQuestion)
        .filter(BotTestQuestion.bot_id == bot.id)
        .order_by(BotTestQuestion.created_at)
        .all()
    )
    now = datetime.now(timezone.utc)
    for q in rows:
        try:
            result = answer_question(bot=bot, question=q.question, db=db, conversation=None)
            q.last_answer = result["answer"]
            q.last_fallback = result["fallback"]
            q.last_score = result["retrieval_score"]
        except Exception:
            logger.exception("Test question run failed for %s", q.id)
            q.last_answer = "(実行エラー)"
            q.last_fallback = True
            q.last_score = None
        q.last_run_at = now
    db.commit()
    for q in rows:
        db.refresh(q)
    return [_to_response(q) for q in rows]
