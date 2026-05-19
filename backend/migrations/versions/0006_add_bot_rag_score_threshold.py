"""add bot rag_score_threshold

Revision ID: 0006
Revises: 0005
Create Date: 2026-05-19

"""
from alembic import op
import sqlalchemy as sa

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "bots",
        sa.Column("rag_score_threshold", sa.Float(), nullable=False, server_default=sa.text("0.5")),
    )


def downgrade() -> None:
    op.drop_column("bots", "rag_score_threshold")
