"""
Seed script: 初期管理者ユーザーと theme_presets を投入する。

使い方:
  docker compose exec backend python -m seeds.seed

環境変数 SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD / SEED_ADMIN_NAME で
管理者情報を上書きできる（未設定時はデフォルト値を使用）。
"""
import os
import sys
from pathlib import Path

# プロジェクトルートを sys.path に追加
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.user import User
from app.models.theme_preset import ThemePreset
from app.core.security import hash_password

ADMIN_EMAIL = os.getenv("SEED_ADMIN_EMAIL", "admin@example.com")
ADMIN_PASSWORD = os.getenv("SEED_ADMIN_PASSWORD", "changeme1234")
ADMIN_DISPLAY_NAME = os.getenv("SEED_ADMIN_NAME", "Admin")

THEME_PRESETS = [
    {
        "code": "blue",
        "name": "Blue",
        "background_color": "#F5F9FF",
        "button_color": "#2563EB",
        "bubble_color": "#DBEAFE",
        "text_color": "#111827",
        "muted_text_color": "#6B7280",
        "border_color": "#BFDBFE",
        "sort_order": 1,
    },
    {
        "code": "green",
        "name": "Green",
        "background_color": "#F0FDF4",
        "button_color": "#16A34A",
        "bubble_color": "#DCFCE7",
        "text_color": "#111827",
        "muted_text_color": "#6B7280",
        "border_color": "#BBF7D0",
        "sort_order": 2,
    },
    {
        "code": "purple",
        "name": "Purple",
        "background_color": "#FAF5FF",
        "button_color": "#7C3AED",
        "bubble_color": "#EDE9FE",
        "text_color": "#111827",
        "muted_text_color": "#6B7280",
        "border_color": "#DDD6FE",
        "sort_order": 3,
    },
    {
        "code": "orange",
        "name": "Orange",
        "background_color": "#FFF7ED",
        "button_color": "#EA580C",
        "bubble_color": "#FED7AA",
        "text_color": "#111827",
        "muted_text_color": "#6B7280",
        "border_color": "#FDBA74",
        "sort_order": 4,
    },
    {
        "code": "neutral",
        "name": "Neutral",
        "background_color": "#F9FAFB",
        "button_color": "#374151",
        "bubble_color": "#F3F4F6",
        "text_color": "#111827",
        "muted_text_color": "#6B7280",
        "border_color": "#E5E7EB",
        "sort_order": 5,
    },
]


def seed_theme_presets(db: Session) -> None:
    for preset_data in THEME_PRESETS:
        existing = db.query(ThemePreset).filter(ThemePreset.code == preset_data["code"]).first()
        if existing:
            print(f"  [SKIP] theme_preset: {preset_data['code']} already exists")
            continue
        preset = ThemePreset(**preset_data)
        db.add(preset)
        print(f"  [ADD]  theme_preset: {preset_data['code']}")
    db.commit()


def seed_admin_user(db: Session) -> None:
    existing = db.query(User).filter(User.email == ADMIN_EMAIL).first()
    if existing:
        print(f"  [SKIP] admin user: {ADMIN_EMAIL} already exists")
        return
    user = User(
        email=ADMIN_EMAIL,
        password_hash=hash_password(ADMIN_PASSWORD),
        display_name=ADMIN_DISPLAY_NAME,
        is_active=True,
    )
    db.add(user)
    db.commit()
    print(f"  [ADD]  admin user: {ADMIN_EMAIL}")
    print(f"         password:   {ADMIN_PASSWORD}")
    print("         ⚠️  本番環境では必ずパスワードを変更してください")


def main() -> None:
    print("=== Seeding database ===")
    db: Session = SessionLocal()
    try:
        print("\n[1] theme_presets")
        seed_theme_presets(db)

        print("\n[2] admin user")
        seed_admin_user(db)

        print("\n=== Seed complete ===")
    finally:
        db.close()


if __name__ == "__main__":
    main()
