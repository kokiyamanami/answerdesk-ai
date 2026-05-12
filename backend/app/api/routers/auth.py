from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.security import create_access_token, verify_password
from app.db.session import get_db
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["auth"])


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

    return LoginResponse(user=UserResponse(id=str(user.id), email=user.email, display_name=user.display_name))


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie("access_token")
    return {"message": "ログアウトしました。"}


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return UserResponse(id=str(current_user.id), email=current_user.email, display_name=current_user.display_name)
