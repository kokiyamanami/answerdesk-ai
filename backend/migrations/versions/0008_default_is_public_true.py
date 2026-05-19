"""default is_public to true

Revision ID: 0008
Revises: 0007
Create Date: 2026-05-19
"""
from alembic import op

revision = '0008'
down_revision = '0007'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("bots", "is_public", server_default="true")


def downgrade() -> None:
    op.alter_column("bots", "is_public", server_default="false")
