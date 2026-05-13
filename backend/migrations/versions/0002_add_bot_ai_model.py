"""Add ai_model column to bots

Revision ID: 0002
Revises: 0001
Create Date: 2026-05-13

"""
from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("bots", sa.Column("ai_model", sa.String(50), nullable=False, server_default="gpt-4.1-mini"))
    op.alter_column("bots", "ai_model", server_default=None)


def downgrade() -> None:
    op.drop_column("bots", "ai_model")
