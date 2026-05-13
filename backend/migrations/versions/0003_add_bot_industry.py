"""Add industry column to bots

Revision ID: 0003
Revises: 0002
Create Date: 2026-05-13

"""
from alembic import op
import sqlalchemy as sa

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("bots", sa.Column("industry", sa.String(50), nullable=True))


def downgrade() -> None:
    op.drop_column("bots", "industry")
