"""Add form_fields column to bots

Revision ID: 0004
Revises: 0003
Create Date: 2026-05-13

"""
from alembic import op
import sqlalchemy as sa

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("bots", sa.Column("form_fields", sa.JSON, nullable=True))


def downgrade() -> None:
    op.drop_column("bots", "form_fields")
