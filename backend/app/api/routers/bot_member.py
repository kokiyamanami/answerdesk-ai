from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_user_membership, require_bot_owner
from app.db.session import get_db
from app.models.bot_member import ROLE_OWNER, VALID_ROLES, BotMember
from app.models.user import User

router = APIRouter(prefix="/bot/members", tags=["bot-member"])


class MemberResponse(BaseModel):
    user_id: str
    email: str
    display_name: str
    role: str
    is_me: bool
    created_at: datetime


class InviteRequest(BaseModel):
    email: str
    role: str = "editor"


class RoleUpdateRequest(BaseModel):
    role: str


def _members(bot_id, db: Session) -> list[BotMember]:
    return (
        db.query(BotMember)
        .filter(BotMember.bot_id == bot_id)
        .order_by((BotMember.role != ROLE_OWNER), BotMember.created_at)
        .all()
    )


def _to_response(m: BotMember, user: User, me_id) -> MemberResponse:
    return MemberResponse(
        user_id=str(m.user_id), email=user.email, display_name=user.display_name,
        role=m.role, is_me=(m.user_id == me_id), created_at=m.created_at,
    )


@router.get("", response_model=list[MemberResponse])
def list_members(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    bot, _ = get_user_membership(current_user, db)
    rows = _members(bot.id, db)
    users = {u.id: u for u in db.query(User).filter(User.id.in_([m.user_id for m in rows])).all()}
    return [_to_response(m, users[m.user_id], current_user.id) for m in rows if m.user_id in users]


@router.post("", response_model=MemberResponse, status_code=status.HTTP_201_CREATED)
def invite_member(body: InviteRequest,
                  current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    bot, _ = require_bot_owner(current_user, db)
    role = body.role.strip().lower()
    if role not in VALID_ROLES:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail={"code": "invalid_role", "message": "ロールは owner か editor です。"})
    email = body.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail={"code": "user_not_found",
                                    "message": "そのメールのユーザーは未登録です。先に登録してもらってください。"})
    if db.query(BotMember).filter(BotMember.bot_id == bot.id, BotMember.user_id == user.id).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail={"code": "already_member", "message": "すでにメンバーです。"})
    m = BotMember(bot_id=bot.id, user_id=user.id, role=role)
    db.add(m)
    db.commit()
    db.refresh(m)
    return _to_response(m, user, current_user.id)


@router.patch("/{user_id}", response_model=MemberResponse)
def update_member_role(user_id: str, body: RoleUpdateRequest,
                       current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    bot, _ = require_bot_owner(current_user, db)
    role = body.role.strip().lower()
    if role not in VALID_ROLES:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail={"code": "invalid_role", "message": "ロールは owner か editor です。"})
    target = db.query(BotMember).filter(
        BotMember.bot_id == bot.id, BotMember.user_id == UUID(user_id)).first()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail={"code": "not_found", "message": "メンバーが見つかりません。"})
    if target.role == ROLE_OWNER and role != ROLE_OWNER:
        owners = db.query(BotMember).filter(
            BotMember.bot_id == bot.id, BotMember.role == ROLE_OWNER).count()
        if owners <= 1:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                                detail={"code": "last_owner",
                                        "message": "オーナーが1人だけのため変更できません。"})
    target.role = role
    db.commit()
    db.refresh(target)
    user = db.query(User).filter(User.id == target.user_id).first()
    return _to_response(target, user, current_user.id)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(user_id: str,
                  current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    bot, _ = require_bot_owner(current_user, db)
    target = db.query(BotMember).filter(
        BotMember.bot_id == bot.id, BotMember.user_id == UUID(user_id)).first()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail={"code": "not_found", "message": "メンバーが見つかりません。"})
    if target.role == ROLE_OWNER:
        owners = db.query(BotMember).filter(
            BotMember.bot_id == bot.id, BotMember.role == ROLE_OWNER).count()
        if owners <= 1:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                                detail={"code": "last_owner",
                                        "message": "最後のオーナーは削除できません。"})
    db.delete(target)
    db.commit()
