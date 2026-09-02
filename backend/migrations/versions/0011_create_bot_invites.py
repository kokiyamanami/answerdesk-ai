"""create bot_invites

Revision ID: 0011
Revises: 0010
Create Date: 2026-09-03
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "0011"
down_revision = "0010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "bot_invites",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("bot_id", UUID(as_uuid=True),
                  sa.ForeignKey("bots.id", ondelete="CASCADE"), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False, server_default="editor"),
        sa.Column("invited_by", UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("bot_id", "email", name="uq_bot_invites_bot_email"),
    )
    op.create_index("ix_bot_invites_email", "bot_invites", ["email"])
    op.create_index("ix_bot_invites_bot_id", "bot_invites", ["bot_id"])


def downgrade() -> None:
    op.drop_index("ix_bot_invites_bot_id", table_name="bot_invites")
    op.drop_index("ix_bot_invites_email", table_name="bot_invites")
    op.drop_table("bot_invites")
