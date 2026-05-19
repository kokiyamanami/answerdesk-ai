import os
from fastapi import APIRouter, HTTPException, Header
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.user import User
from app.models.theme_preset import ThemePreset
from app.core.security import hash_password

router = APIRouter(prefix="/admin", tags=["admin"])

SEED_SECRET = os.getenv("SEED_SECRET", "")

THEME_PRESETS = [
    {"code": "blue", "name": "Blue", "background_color": "#F5F9FF", "button_color": "#2563EB", "bubble_color": "#DBEAFE", "text_color": "#111827", "muted_text_color": "#6B7280", "border_color": "#BFDBFE", "sort_order": 1},
    {"code": "green", "name": "Green", "background_color": "#F0FDF4", "button_color": "#16A34A", "bubble_color": "#DCFCE7", "text_color": "#111827", "muted_text_color": "#6B7280", "border_color": "#BBF7D0", "sort_order": 2},
    {"code": "purple", "name": "Purple", "background_color": "#FAF5FF", "button_color": "#7C3AED", "bubble_color": "#EDE9FE", "text_color": "#111827", "muted_text_color": "#6B7280", "border_color": "#DDD6FE", "sort_order": 3},
    {"code": "orange", "name": "Orange", "background_color": "#FFF7ED", "button_color": "#EA580C", "bubble_color": "#FED7AA", "text_color": "#111827", "muted_text_color": "#6B7280", "border_color": "#FDBA74", "sort_order": 4},
    {"code": "neutral", "name": "Neutral", "background_color": "#F9FAFB", "button_color": "#374151", "bubble_color": "#F3F4F6", "text_color": "#111827", "muted_text_color": "#6B7280", "border_color": "#E5E7EB", "sort_order": 5},
]


@router.post("/seed")
def run_seed(x_seed_secret: str = Header(...)):
    if not SEED_SECRET or x_seed_secret != SEED_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden")

    results = []
    db: Session = SessionLocal()
    try:
        for preset_data in THEME_PRESETS:
            if not db.query(ThemePreset).filter(ThemePreset.code == preset_data["code"]).first():
                db.add(ThemePreset(**preset_data))
                results.append(f"added theme: {preset_data['code']}")
            else:
                results.append(f"skipped theme: {preset_data['code']}")
        db.commit()

        admin_email = os.getenv("SEED_ADMIN_EMAIL", "admin@example.com")
        admin_password = os.getenv("SEED_ADMIN_PASSWORD", "changeme1234")
        admin_name = os.getenv("SEED_ADMIN_NAME", "Admin")
        if not db.query(User).filter(User.email == admin_email).first():
            db.add(User(email=admin_email, password_hash=hash_password(admin_password), display_name=admin_name, is_active=True))
            db.commit()
            results.append(f"added admin: {admin_email}")
        else:
            results.append(f"skipped admin: {admin_email}")
    finally:
        db.close()

    return {"status": "ok", "results": results}
