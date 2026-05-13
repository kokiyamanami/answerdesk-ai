"""Create form_submissions table

Revision ID: 0005
Revises: 0004
Create Date: 2026-05-13

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "form_submissions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("bot_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("bots.id", ondelete="CASCADE"), nullable=False),
        sa.Column("conversation_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("conversations.id", ondelete="SET NULL"), nullable=True),
        sa.Column("data", sa.JSON, nullable=False),
        sa.Column("submitted_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_form_submissions_bot_id", "form_submissions", ["bot_id"])


def downgrade() -> None:
    op.drop_index("ix_form_submissions_bot_id", table_name="form_submissions")
    op.drop_table("form_submissions")
