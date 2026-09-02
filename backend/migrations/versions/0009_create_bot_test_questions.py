"""create bot_test_questions

Revision ID: 0009
Revises: 0008
Create Date: 2026-09-03
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "bot_test_questions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("bot_id", UUID(as_uuid=True),
                  sa.ForeignKey("bots.id", ondelete="CASCADE"), nullable=False),
        sa.Column("question", sa.Text(), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("last_answer", sa.Text(), nullable=True),
        sa.Column("last_fallback", sa.Boolean(), nullable=True),
        sa.Column("last_score", sa.Float(), nullable=True),
        sa.Column("last_run_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_bot_test_questions_bot_id", "bot_test_questions", ["bot_id"])


def downgrade() -> None:
    op.drop_index("ix_bot_test_questions_bot_id", table_name="bot_test_questions")
    op.drop_table("bot_test_questions")
