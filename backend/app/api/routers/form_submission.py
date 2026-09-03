from fastapi import APIRouter, Depends, Header
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from app.api.deps import get_current_user, find_user_bot
from app.db.session import get_db
from app.models.bot import Bot
from app.models.form_submission import FormSubmission
from app.models.user import User

router = APIRouter(prefix="/form-submissions", tags=["form_submission"])


class FormSubmissionResponse(BaseModel):
    id: str
    conversation_id: Optional[str]
    data: dict
    submitted_at: str


@router.get("", response_model=list[FormSubmissionResponse])
def list_form_submissions(
    current_user: User = Depends(get_current_user),
    x_bot_id: str | None = Header(None, alias="X-Bot-Id"),
    db: Session = Depends(get_db),
):
    bot = find_user_bot(current_user, db, x_bot_id)
    if not bot:
        return []
    submissions = (
        db.query(FormSubmission)
        .filter(FormSubmission.bot_id == bot.id)
        .order_by(FormSubmission.submitted_at.desc())
        .all()
    )
    return [
        FormSubmissionResponse(
            id=str(s.id),
            conversation_id=str(s.conversation_id) if s.conversation_id else None,
            data=s.data,
            submitted_at=s.submitted_at.isoformat() + 'Z',
        )
        for s in submissions
    ]
