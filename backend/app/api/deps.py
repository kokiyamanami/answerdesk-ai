from typing import Optional
from uuid import UUID

from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.bot import Bot
from app.models.bot_member import ROLE_OWNER, BotMember
from app.models.user import User

_bot_not_found = HTTPException(
    status_code=status.HTTP_404_NOT_FOUND,
    detail={"code": "bot_not_found", "message": "ボットが見つかりません。"},
)


def get_current_user(
    access_token: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail={"code": "unauthorized", "message": "認証が必要です。"},
    )
    if not access_token:
        raise credentials_exception

    user_id = decode_access_token(access_token)
    if not user_id:
        raise credentials_exception

    try:
        uid = UUID(user_id)
    except ValueError:
        raise credentials_exception

    user = db.query(User).filter(User.id == uid, User.is_active == True).first()
    if not user:
        raise credentials_exception

    return user


def get_user_membership(current_user: User, db: Session) -> tuple[Bot, BotMember]:
    """current_user が編集権を持つボットと、その所属レコードを返す。
    複数所属している場合は owner を優先し、次に参加順。"""
    member = (
        db.query(BotMember)
        .filter(BotMember.user_id == current_user.id)
        .order_by((BotMember.role != ROLE_OWNER), BotMember.created_at)
        .first()
    )
    if not member:
        raise _bot_not_found
    bot = db.query(Bot).filter(Bot.id == member.bot_id).first()
    if not bot:
        raise _bot_not_found
    return bot, member


def get_user_bot(current_user: User, db: Session) -> Bot:
    """current_user が編集権を持つボットを返す（無ければ 404）。"""
    bot, _ = get_user_membership(current_user, db)
    return bot


def find_user_bot(current_user: User, db: Session) -> Optional[Bot]:
    """current_user が編集権を持つボットを返す（無ければ None）。"""
    member = (
        db.query(BotMember)
        .filter(BotMember.user_id == current_user.id)
        .order_by((BotMember.role != ROLE_OWNER), BotMember.created_at)
        .first()
    )
    if not member:
        return None
    return db.query(Bot).filter(Bot.id == member.bot_id).first()


def require_bot_owner(current_user: User, db: Session) -> tuple[Bot, BotMember]:
    """owner 権限が必要な操作用。owner でなければ 403。"""
    bot, member = get_user_membership(current_user, db)
    if member.role != ROLE_OWNER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "forbidden", "message": "この操作にはオーナー権限が必要です。"},
        )
    return bot, member
