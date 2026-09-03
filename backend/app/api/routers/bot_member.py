from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Header, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_user_membership, require_bot_owner
from app.db.session import get_db
from app.models.bot_invite import BotInvite
from app.models.bot_member import ROLE_OWNER, VALID_ROLES, BotMember
from app.models.user import User

router = APIRouter(prefix="/bot/members", tags=["bot-member"])


class MemberResponse(BaseModel):
    status: str  # "active" | "pending"
    user_id: Optional[str]
    invite_id: Optional[str]
    email: str
    display_name: Optional[str]
    role: str
    is_me: bool
    created_at: datetime


class InviteRequest(BaseModel):
    email: str
    role: str = "editor"


class RoleUpdateRequest(BaseModel):
    role: str


def _member_row(m: BotMember, user: User, me_id) -> MemberResponse:
    return MemberResponse(
        status="active", user_id=str(m.user_id), invite_id=None,
        email=user.email, display_name=user.display_name,
        role=m.role, is_me=(m.user_id == me_id), created_at=m.created_at,
    )


def _invite_row(inv: BotInvite) -> MemberResponse:
    return MemberResponse(
        status="pending", user_id=None, invite_id=str(inv.id),
        email=inv.email, display_name=None,
        role=inv.role, is_me=False, created_at=inv.created_at,
    )


def _validate_role(role: str) -> str:
    role = role.strip().lower()
    if role not in VALID_ROLES:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail={"code": "invalid_role", "message": "ロールは owner か editor です。"})
    return role


@router.get("", response_model=list[MemberResponse])
def list_members(current_user: User = Depends(get_current_user), x_bot_id: str | None = Header(None, alias="X-Bot-Id"), db: Session = Depends(get_db)):
    bot, _ = get_user_membership(current_user, db, x_bot_id)
    members = (
        db.query(BotMember)
        .filter(BotMember.bot_id == bot.id)
        .order_by((BotMember.role != ROLE_OWNER), BotMember.created_at)
        .all()
    )
    users = {u.id: u for u in db.query(User).filter(User.id.in_([m.user_id for m in members])).all()}
    rows = [_member_row(m, users[m.user_id], current_user.id) for m in members if m.user_id in users]
    invites = (
        db.query(BotInvite)
        .filter(BotInvite.bot_id == bot.id)
        .order_by(BotInvite.created_at)
        .all()
    )
    rows.extend(_invite_row(i) for i in invites)
    return rows


@router.post("", response_model=MemberResponse, status_code=status.HTTP_201_CREATED)
def invite_member(body: InviteRequest,
                  current_user: User = Depends(get_current_user), x_bot_id: str | None = Header(None, alias="X-Bot-Id"), db: Session = Depends(get_db)):
    bot, _ = require_bot_owner(current_user, db, x_bot_id)
    role = _validate_role(body.role)
    email = body.email.strip().lower()
    if not email:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail={"code": "email_required", "message": "メールアドレスを入力してください。"})

    user = db.query(User).filter(User.email == email).first()
    if user:
        if db.query(BotMember).filter(BotMember.bot_id == bot.id, BotMember.user_id == user.id).first():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                                detail={"code": "already_member", "message": "すでにメンバーです。"})
        m = BotMember(bot_id=bot.id, user_id=user.id, role=role)
        db.add(m)
        db.commit()
        db.refresh(m)
        return _member_row(m, user, current_user.id)

    # 未登録 → 保留招待
    existing = db.query(BotInvite).filter(BotInvite.bot_id == bot.id, BotInvite.email == email).first()
    if existing:
        existing.role = role
        db.commit()
        db.refresh(existing)
        return _invite_row(existing)
    inv = BotInvite(bot_id=bot.id, email=email, role=role, invited_by=current_user.id)
    db.add(inv)
    db.commit()
    db.refresh(inv)
    return _invite_row(inv)


@router.patch("/{user_id}", response_model=MemberResponse)
def update_member_role(user_id: str, body: RoleUpdateRequest,
                       current_user: User = Depends(get_current_user), x_bot_id: str | None = Header(None, alias="X-Bot-Id"), db: Session = Depends(get_db)):
    bot, _ = require_bot_owner(current_user, db, x_bot_id)
    role = _validate_role(body.role)
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
                                detail={"code": "last_owner", "message": "オーナーが1人だけのため変更できません。"})
    target.role = role
    db.commit()
    db.refresh(target)
    user = db.query(User).filter(User.id == target.user_id).first()
    return _member_row(target, user, current_user.id)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(user_id: str,
                  current_user: User = Depends(get_current_user), x_bot_id: str | None = Header(None, alias="X-Bot-Id"), db: Session = Depends(get_db)):
    bot, _ = require_bot_owner(current_user, db, x_bot_id)
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
                                detail={"code": "last_owner", "message": "最後のオーナーは削除できません。"})
    db.delete(target)
    db.commit()


@router.delete("/invites/{invite_id}", status_code=status.HTTP_204_NO_CONTENT)
def cancel_invite(invite_id: str,
                  current_user: User = Depends(get_current_user), x_bot_id: str | None = Header(None, alias="X-Bot-Id"), db: Session = Depends(get_db)):
    bot, _ = require_bot_owner(current_user, db, x_bot_id)
    inv = db.query(BotInvite).filter(
        BotInvite.id == UUID(invite_id), BotInvite.bot_id == bot.id).first()
    if not inv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail={"code": "not_found", "message": "招待が見つかりません。"})
    db.delete(inv)
    db.commit()
