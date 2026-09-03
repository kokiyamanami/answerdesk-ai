"""allow 'clarify' in messages.message_type check constraint

Revision ID: 0014
Revises: 0013
Create Date: 2026-09-03
"""
from alembic import op

revision = "0014"
down_revision = "0013"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint("chk_messages_message_type", "messages", type_="check")
    op.create_check_constraint(
        "chk_messages_message_type", "messages",
        "message_type IN ('normal', 'fallback', 'clarify')",
    )


def downgrade() -> None:
    op.drop_constraint("chk_messages_message_type", "messages", type_="check")
    op.create_check_constraint(
        "chk_messages_message_type", "messages",
        "message_type IN ('normal', 'fallback')",
    )
