from typing import Optional
from uuid import UUID

from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.user import User


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
