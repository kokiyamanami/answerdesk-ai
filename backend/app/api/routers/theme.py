from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.theme_preset import ThemePreset
from app.models.user import User

router = APIRouter(prefix="/theme-presets", tags=["theme"])


class ThemePresetResponse(BaseModel):
    id: str
    code: str
    name: str
    background_color: str
    button_color: str
    bubble_color: str
    text_color: str
    muted_text_color: Optional[str]
    border_color: Optional[str]
    sort_order: int

    model_config = {"from_attributes": True}


@router.get("", response_model=list[ThemePresetResponse])
def list_theme_presets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    presets = (
        db.query(ThemePreset)
        .filter(ThemePreset.is_active == True)
        .order_by(ThemePreset.sort_order)
        .all()
    )
    return [
        ThemePresetResponse(
            id=str(p.id),
            code=p.code,
            name=p.name,
            background_color=p.background_color,
            button_color=p.button_color,
            bubble_color=p.bubble_color,
            text_color=p.text_color,
            muted_text_color=p.muted_text_color,
            border_color=p.border_color,
            sort_order=p.sort_order,
        )
        for p in presets
    ]
