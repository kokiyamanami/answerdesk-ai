from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.security import create_access_token, hash_password, verify_password
from app.db.session import get_db
from app.models.bot_invite import BotInvite
from app.models.bot_member import BotMember
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["auth"])


def _consume_pending_invites(user: User, db: Session) -> None:
    """user のメール宛の保留招待を bot_members に変換する。"""
    invites = db.query(BotInvite).filter(BotInvite.email == user.email).all()
    if not invites:
        return
    for inv in invites:
        already = db.query(BotMember).filter(
            BotMember.bot_id == inv.bot_id, BotMember.user_id == user.id).first()
        if not already:
            db.add(BotMember(bot_id=inv.bot_id, user_id=user.id, role=inv.role))
        db.delete(inv)
    db.commit()


class LoginRequest(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    display_name: str

    model_config = {"from_attributes": True}


class LoginResponse(BaseModel):
    user: UserResponse


class RegisterRequest(BaseModel):
    email: str
    password: str


@router.post("/register", response_model=LoginResponse, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, response: Response, db: Session = Depends(get_db)):
    if len(body.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "password_too_short", "message": "パスワードは8文字以上で入力してください。"},
        )
    existing = db.query(User).filter(User.email == body.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "email_taken", "message": "このメールアドレスはすでに使われています。"},
        )
    user = User(
        email=body.email.lower(),
        password_hash=hash_password(body.password),
        display_name=body.email.split('@')[0],
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    _consume_pending_invites(user, db)

    token = create_access_token(str(user.id))
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        max_age=settings.jwt_expires_in,
    )
    return LoginResponse(user=UserResponse(id=str(user.id), email=user.email, display_name=user.display_name))


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email.lower()).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "invalid_credentials", "message": "メールアドレスまたはパスワードが正しくありません。"},
        )

    token = create_access_token(str(user.id))
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        max_age=settings.jwt_expires_in,
    )

    from datetime import datetime, timezone
    user.last_login_at = datetime.now(timezone.utc)
    db.commit()

    _consume_pending_invites(user, db)

    return LoginResponse(user=UserResponse(id=str(user.id), email=user.email, display_name=user.display_name))


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(
        key="access_token",
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
    )
    return {"message": "ログアウトしました。"}


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return UserResponse(id=str(current_user.id), email=current_user.email, display_name=current_user.display_name)
