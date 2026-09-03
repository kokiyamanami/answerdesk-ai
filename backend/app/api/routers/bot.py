import os
import re
import uuid
import logging

import boto3

logger = logging.getLogger(__name__)
from fastapi import APIRouter, Depends, File, Header, HTTPException, Query, UploadFile, status
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session
from typing import Optional

from app.api.deps import get_current_user, find_user_bot, get_user_bot, list_user_bots, require_bot_owner
from app.core.config import settings
from app.db.session import get_db
from app.models.bot import Bot
from app.models.bot_member import ROLE_OWNER, BotMember
from app.models.user import User

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"}
MAX_ICON_BYTES = 2 * 1024 * 1024  # 2MB

router = APIRouter(prefix="/bot", tags=["bot"])

SLUG_PATTERN = re.compile(r'^[a-z0-9](?:[a-z0-9-]{1,48}[a-z0-9])?$')


class BotResponse(BaseModel):
    id: str
    public_slug: str
    is_public: bool
    chat_title: str
    icon_url: Optional[str]
    welcome_message: Optional[str]
    theme_preset_id: Optional[str]
    fallback_enabled: bool
    fallback_message: str
    fallback_contact_url: Optional[str]
    fallback_contact_email: Optional[str]
    clarify_message: Optional[str] = None
    persona: Optional[str] = None
    status: str
    rag_score_threshold: float
    ai_model: str
    industry: Optional[str]
    form_fields: Optional[list] = None

    model_config = {"from_attributes": True}


class BotCreateRequest(BaseModel):
    chat_title: str
    public_slug: str

    @field_validator("public_slug")
    @classmethod
    def validate_slug(cls, v: str) -> str:
        if not SLUG_PATTERN.match(v):
            raise ValueError("slugは半角小文字英数字とハイフンのみ、3〜50文字、先頭末尾はハイフン不可です。")
        return v


class BotUpdateRequest(BaseModel):
    chat_title: Optional[str] = None
    public_slug: Optional[str] = None
    is_public: Optional[bool] = None
    icon_url: Optional[str] = None
    welcome_message: Optional[str] = None
    theme_preset_id: Optional[str] = None
    fallback_enabled: Optional[bool] = None
    fallback_message: Optional[str] = None
    fallback_contact_url: Optional[str] = None
    fallback_contact_email: Optional[str] = None
    clarify_message: Optional[str] = None
    persona: Optional[str] = None
    rag_score_threshold: Optional[float] = None
    ai_model: Optional[str] = None
    industry: Optional[str] = None
    form_fields: Optional[list] = None

    @field_validator("public_slug")
    @classmethod
    def validate_slug(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not SLUG_PATTERN.match(v):
            raise ValueError("slugは半角小文字英数字とハイフンのみ、3〜50文字、先頭末尾はハイフン不可です。")
        return v


class SlugCheckResponse(BaseModel):
    value: str
    available: bool


def _bot_to_response(bot: Bot) -> BotResponse:
    return BotResponse(
        id=str(bot.id),
        public_slug=bot.public_slug,
        is_public=bot.is_public,
        chat_title=bot.chat_title,
        icon_url=bot.icon_url,
        welcome_message=bot.welcome_message,
        theme_preset_id=str(bot.theme_preset_id) if bot.theme_preset_id else None,
        fallback_enabled=bot.fallback_enabled,
        fallback_message=bot.fallback_message,
        fallback_contact_url=bot.fallback_contact_url,
        fallback_contact_email=bot.fallback_contact_email,
        clarify_message=bot.clarify_message,
        persona=bot.persona,
        status=bot.status,
        rag_score_threshold=bot.rag_score_threshold if bot.rag_score_threshold is not None else 0.5,
        ai_model=bot.ai_model or "gpt-4.1-mini",
        industry=bot.industry,
        form_fields=bot.form_fields,
    )


class BotSummaryResponse(BaseModel):
    id: str
    chat_title: str
    public_slug: str
    is_public: bool
    role: str


@router.get("/list", response_model=list[BotSummaryResponse])
def list_bots(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return [
        BotSummaryResponse(id=str(b.id), chat_title=b.chat_title, public_slug=b.public_slug,
                           is_public=b.is_public, role=role)
        for b, role in list_user_bots(current_user, db)
    ]


@router.get("", response_model=BotResponse)
def get_bot(current_user: User = Depends(get_current_user),
            x_bot_id: str | None = Header(None, alias="X-Bot-Id"),
            db: Session = Depends(get_db)):
    bot = get_user_bot(current_user, db, x_bot_id)
    return _bot_to_response(bot)


@router.post("", response_model=BotResponse, status_code=status.HTTP_201_CREATED)
def create_bot(body: BotCreateRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if db.query(Bot).filter(Bot.public_slug == body.public_slug).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail={"code": "slug_already_taken", "message": "このURLはすでに使用されています。"})
    bot = Bot(
        user_id=current_user.id,
        name=body.chat_title,
        chat_title=body.chat_title,
        public_slug=body.public_slug,
        fallback_message="申し訳ありませんが、お答えできませんでした。お問い合わせください。",
    )
    db.add(bot)
    db.flush()
    db.add(BotMember(bot_id=bot.id, user_id=current_user.id, role=ROLE_OWNER))
    db.commit()
    db.refresh(bot)
    return _bot_to_response(bot)


@router.patch("", response_model=BotResponse)
def update_bot(body: BotUpdateRequest, current_user: User = Depends(get_current_user),
               x_bot_id: str | None = Header(None, alias="X-Bot-Id"),
               db: Session = Depends(get_db)):
    bot = get_user_bot(current_user, db, x_bot_id)

    if body.public_slug and body.public_slug != bot.public_slug:
        if db.query(Bot).filter(Bot.public_slug == body.public_slug, Bot.id != bot.id).first():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                                detail={"code": "slug_already_taken", "message": "このURLはすでに使用されています。"})

    update_data = body.model_dump(exclude_none=True)
    if "theme_preset_id" in update_data:
        update_data["theme_preset_id"] = uuid.UUID(update_data["theme_preset_id"]) if update_data["theme_preset_id"] else None

    for key, value in update_data.items():
        setattr(bot, key, value)

    db.commit()
    db.refresh(bot)
    return _bot_to_response(bot)


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def delete_bot(current_user: User = Depends(get_current_user),
               x_bot_id: str | None = Header(None, alias="X-Bot-Id"),
               db: Session = Depends(get_db)):
    bot, _ = require_bot_owner(current_user, db, x_bot_id)
    db.delete(bot)  # FAQ・ドキュメント・会話・メンバー等は FK CASCADE で消える
    db.commit()


@router.get("/slug/check", response_model=SlugCheckResponse)
def check_slug(
    value: str = Query(..., min_length=3, max_length=50),
    current_user: User = Depends(get_current_user),
    x_bot_id: str | None = Header(None, alias="X-Bot-Id"),
    db: Session = Depends(get_db),
):
    if not SLUG_PATTERN.match(value):
        return SlugCheckResponse(value=value, available=False)
    # 自分のbotの現在のslugは「使用可能」とみなす
    my_bot = find_user_bot(current_user, db, x_bot_id)
    if my_bot and my_bot.public_slug == value:
        return SlugCheckResponse(value=value, available=True)
    exists = db.query(Bot).filter(Bot.public_slug == value).first()
    return SlugCheckResponse(value=value, available=not bool(exists))


@router.post("/icon", response_model=BotResponse)
async def upload_icon(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    x_bot_id: str | None = Header(None, alias="X-Bot-Id"),
    db: Session = Depends(get_db),
):
    bot = get_user_bot(current_user, db, x_bot_id)

    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail={"code": "invalid_file_type", "message": "JPEG / PNG / GIF / WebP / SVG のみアップロードできます。"})

    contents = await file.read()
    if len(contents) > MAX_ICON_BYTES:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail={"code": "file_too_large", "message": "アイコン画像は2MB以内にしてください。"})

    ext = (file.filename or "icon").rsplit(".", 1)[-1].lower()
    file_name = f"{uuid.uuid4().hex}.{ext}"

    if settings.app_env != "prod":
        # dev: /app/uploads/icons/ に保存
        save_dir = "/app/uploads/icons"
        os.makedirs(save_dir, exist_ok=True)
        with open(f"{save_dir}/{file_name}", "wb") as f:
            f.write(contents)
        public_url = f"/uploads/icons/{file_name}"
    else:
        s3_key = f"icons/{bot.id}/{file_name}"
        public_url = f"https://{settings.s3_bucket_name}.s3.{settings.aws_region}.amazonaws.com/{s3_key}"
        try:
            s3 = boto3.client("s3", region_name=settings.aws_region)
            s3.put_object(
                Bucket=settings.s3_bucket_name,
                Key=s3_key,
                Body=contents,
                ContentType=file.content_type,
            )
        except Exception as e:
            logger.exception("S3 upload failed: %s", e)
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                                detail={"code": "upload_failed", "message": "アイコンのアップロードに失敗しました。"})

    bot.icon_url = public_url
    db.commit()
    db.refresh(bot)
    return _bot_to_response(bot)
