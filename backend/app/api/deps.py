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


def get_user_membership(current_user: User, db: Session,
                        bot_id: Optional[str] = None) -> tuple[Bot, BotMember]:
    """current_user が編集権を持つボットと所属レコードを返す。
    bot_id 指定時はそのボット（所属していなければ 404）。未指定時は owner 優先→参加順で1つ。"""
    q = db.query(BotMember).filter(BotMember.user_id == current_user.id)
    if bot_id:
        try:
            bid = UUID(str(bot_id))
        except (ValueError, TypeError):
            raise _bot_not_found
        member = q.filter(BotMember.bot_id == bid).first()
    else:
        member = q.order_by((BotMember.role != ROLE_OWNER), BotMember.created_at).first()
    if not member:
        raise _bot_not_found
    bot = db.query(Bot).filter(Bot.id == member.bot_id).first()
    if not bot:
        raise _bot_not_found
    return bot, member


def get_user_bot(current_user: User, db: Session, bot_id: Optional[str] = None) -> Bot:
    """current_user が編集権を持つボットを返す（無ければ 404）。"""
    bot, _ = get_user_membership(current_user, db, bot_id)
    return bot


def find_user_bot(current_user: User, db: Session, bot_id: Optional[str] = None) -> Optional[Bot]:
    """current_user が編集権を持つボットを返す（無ければ None）。"""
    try:
        return get_user_bot(current_user, db, bot_id)
    except HTTPException:
        return None


def require_bot_owner(current_user: User, db: Session,
                      bot_id: Optional[str] = None) -> tuple[Bot, BotMember]:
    """owner 権限が必要な操作用。owner でなければ 403。"""
    bot, member = get_user_membership(current_user, db, bot_id)
    if member.role != ROLE_OWNER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "forbidden", "message": "この操作にはオーナー権限が必要です。"},
        )
    return bot, member


def list_user_bots(current_user: User, db: Session) -> list[tuple[Bot, str]]:
    """current_user が所属する全ボットと自分のロールを返す（owner 優先→参加順）。"""
    members = (
        db.query(BotMember)
        .filter(BotMember.user_id == current_user.id)
        .order_by((BotMember.role != ROLE_OWNER), BotMember.created_at)
        .all()
    )
    if not members:
        return []
    bots = {b.id: b for b in db.query(Bot).filter(Bot.id.in_([m.bot_id for m in members])).all()}
    return [(bots[m.bot_id], m.role) for m in members if m.bot_id in bots]
