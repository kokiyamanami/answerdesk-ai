"""create bot_members and backfill owners

Revision ID: 0010
Revises: 0009
Create Date: 2026-09-03
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "0010"
down_revision = "0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "bot_members",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("bot_id", UUID(as_uuid=True),
                  sa.ForeignKey("bots.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False, server_default="editor"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("bot_id", "user_id", name="uq_bot_members_bot_user"),
    )
    op.create_index("ix_bot_members_bot_id", "bot_members", ["bot_id"])
    op.create_index("ix_bot_members_user_id", "bot_members", ["user_id"])

    # 既存ボットの作成者を owner として登録
    op.execute(
        """
        INSERT INTO bot_members (id, bot_id, user_id, role, created_at)
        SELECT gen_random_uuid(), id, user_id, 'owner', now()
        FROM bots
        WHERE user_id IS NOT NULL
        """
    )


def downgrade() -> None:
    op.drop_index("ix_bot_members_user_id", table_name="bot_members")
    op.drop_index("ix_bot_members_bot_id", table_name="bot_members")
    op.drop_table("bot_members")
