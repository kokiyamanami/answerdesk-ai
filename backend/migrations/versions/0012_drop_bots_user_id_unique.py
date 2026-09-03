"""drop unique constraint on bots.user_id (multi-bot per user)

Revision ID: 0012
Revises: 0011
Create Date: 2026-09-03
"""
from alembic import op

revision = "0012"
down_revision = "0011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # SQLAlchemy/Postgres default name for `unique=True` on a column
    op.execute("ALTER TABLE bots DROP CONSTRAINT IF EXISTS bots_user_id_key")


def downgrade() -> None:
    op.create_unique_constraint("bots_user_id_key", "bots", ["user_id"])
