"""Initial schema

Revision ID: 0001
Revises:
Create Date: 2026-05-12

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB
from pgvector.sqlalchemy import Vector

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")

    op.create_table(
        "users",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("password_hash", sa.Text, nullable=False),
        sa.Column("display_name", sa.String(255), nullable=False),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.text("true")),
        sa.Column("last_login_at", sa.DateTime, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.text("NOW()")),
        sa.CheckConstraint("email = lower(email)", name="chk_users_email_lowercase"),
    )

    op.create_table(
        "theme_presets",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("code", sa.String(50), nullable=False, unique=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("background_color", sa.String(7), nullable=False),
        sa.Column("button_color", sa.String(7), nullable=False),
        sa.Column("bubble_color", sa.String(7), nullable=False),
        sa.Column("text_color", sa.String(7), nullable=False),
        sa.Column("muted_text_color", sa.String(7), nullable=True),
        sa.Column("border_color", sa.String(7), nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.text("true")),
        sa.Column("sort_order", sa.Integer, nullable=False, server_default=sa.text("0")),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.text("NOW()")),
    )

    op.create_table(
        "bots",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("public_slug", sa.String(50), nullable=False, unique=True),
        sa.Column("is_public", sa.Boolean, nullable=False, server_default=sa.text("false")),
        sa.Column("chat_title", sa.String(255), nullable=False),
        sa.Column("icon_url", sa.Text, nullable=True),
        sa.Column("welcome_message", sa.Text, nullable=True),
        sa.Column("theme_preset_id", UUID(as_uuid=True), sa.ForeignKey("theme_presets.id", ondelete="SET NULL"), nullable=True),
        sa.Column("fallback_enabled", sa.Boolean, nullable=False, server_default=sa.text("true")),
        sa.Column("fallback_message", sa.Text, nullable=False),
        sa.Column("fallback_contact_url", sa.Text, nullable=True),
        sa.Column("fallback_contact_email", sa.String(255), nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default=sa.text("'active'")),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.text("NOW()")),
        sa.CheckConstraint("status IN ('active', 'inactive')", name="chk_bots_status"),
        sa.CheckConstraint(
            "public_slug ~ '^[a-z0-9](?:[a-z0-9-]{1,48}[a-z0-9])?$'",
            name="chk_bots_public_slug_format",
        ),
    )
    op.create_index("idx_bots_public_slug", "bots", ["public_slug"])

    op.create_table(
        "faqs",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("bot_id", UUID(as_uuid=True), sa.ForeignKey("bots.id", ondelete="CASCADE"), nullable=False),
        sa.Column("question", sa.Text, nullable=False),
        sa.Column("answer", sa.Text, nullable=False),
        sa.Column("category", sa.String(100), nullable=True),
        sa.Column("sort_order", sa.Integer, nullable=False, server_default=sa.text("0")),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("idx_faqs_bot_id", "faqs", ["bot_id"])

    op.create_table(
        "documents",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("bot_id", UUID(as_uuid=True), sa.ForeignKey("bots.id", ondelete="CASCADE"), nullable=False),
        sa.Column("source_type", sa.String(50), nullable=False),
        sa.Column("file_name", sa.String(255), nullable=False),
        sa.Column("storage_url", sa.Text, nullable=False),
        sa.Column("mime_type", sa.String(100), nullable=False),
        sa.Column("file_size_bytes", sa.BigInteger, nullable=False),
        sa.Column("status", sa.String(50), nullable=False, server_default=sa.text("'uploaded'")),
        sa.Column("error_message", sa.Text, nullable=True),
        sa.Column("processed_at", sa.DateTime, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.text("NOW()")),
        sa.CheckConstraint("source_type IN ('pdf')", name="chk_documents_source_type"),
        sa.CheckConstraint("status IN ('uploaded', 'processing', 'processed', 'failed')", name="chk_documents_status"),
        sa.CheckConstraint("file_size_bytes > 0", name="chk_documents_file_size_positive"),
    )
    op.create_index("idx_documents_bot_id", "documents", ["bot_id"])
    op.create_index("idx_documents_status", "documents", ["status"])

    op.create_table(
        "document_chunks",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("bot_id", UUID(as_uuid=True), sa.ForeignKey("bots.id", ondelete="CASCADE"), nullable=False),
        sa.Column("source_kind", sa.String(50), nullable=False),
        sa.Column("source_id", UUID(as_uuid=True), nullable=False),
        sa.Column("chunk_index", sa.Integer, nullable=False),
        sa.Column("title", sa.String(255), nullable=True),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("metadata_json", JSONB, nullable=True),
        sa.Column("embedding", Vector(1536), nullable=False),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.text("NOW()")),
        sa.CheckConstraint("source_kind IN ('faq', 'document')", name="chk_document_chunks_source_kind"),
        sa.CheckConstraint("chunk_index >= 0", name="chk_document_chunks_chunk_index_non_negative"),
    )
    op.create_index("idx_document_chunks_bot_id", "document_chunks", ["bot_id"])
    op.create_index("idx_document_chunks_source", "document_chunks", ["source_kind", "source_id"])
    op.execute(
        """
        CREATE INDEX idx_document_chunks_embedding_ivfflat
          ON document_chunks
          USING ivfflat (embedding vector_cosine_ops)
          WITH (lists = 100)
        """
    )

    op.create_table(
        "conversations",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("bot_id", UUID(as_uuid=True), sa.ForeignKey("bots.id", ondelete="CASCADE"), nullable=False),
        sa.Column("session_token", sa.String(255), nullable=False, unique=True),
        sa.Column("channel", sa.String(50), nullable=False, server_default=sa.text("'public_web'")),
        sa.Column("started_at", sa.DateTime, nullable=False, server_default=sa.text("NOW()")),
        sa.Column("last_message_at", sa.DateTime, nullable=False, server_default=sa.text("NOW()")),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.text("NOW()")),
        sa.CheckConstraint("channel IN ('public_web', 'admin_test')", name="chk_conversations_channel"),
    )
    op.create_index("idx_conversations_bot_id", "conversations", ["bot_id"])
    op.create_index("idx_conversations_session_token", "conversations", ["session_token"])

    op.create_table(
        "messages",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("conversation_id", UUID(as_uuid=True), sa.ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("bot_id", UUID(as_uuid=True), sa.ForeignKey("bots.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("message_type", sa.String(30), nullable=False, server_default=sa.text("'normal'")),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("retrieval_score", sa.Numeric(8, 5), nullable=True),
        sa.Column("fallback_triggered", sa.Boolean, nullable=False, server_default=sa.text("false")),
        sa.Column("model_name", sa.String(100), nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.text("NOW()")),
        sa.CheckConstraint("role IN ('user', 'assistant', 'system')", name="chk_messages_role"),
        sa.CheckConstraint("message_type IN ('normal', 'fallback')", name="chk_messages_message_type"),
    )
    op.create_index("idx_messages_conversation_id", "messages", ["conversation_id"])
    op.create_index("idx_messages_bot_id", "messages", ["bot_id"])

    op.create_table(
        "message_citations",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("message_id", UUID(as_uuid=True), sa.ForeignKey("messages.id", ondelete="CASCADE"), nullable=False),
        sa.Column("chunk_id", UUID(as_uuid=True), sa.ForeignKey("document_chunks.id", ondelete="CASCADE"), nullable=False),
        sa.Column("rank_order", sa.Integer, nullable=False),
        sa.Column("score", sa.Numeric(8, 5), nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.text("NOW()")),
        sa.CheckConstraint("rank_order > 0", name="chk_message_citations_rank_order_positive"),
    )
    op.create_index("idx_message_citations_message_id", "message_citations", ["message_id"])
    op.create_index("idx_message_citations_chunk_id", "message_citations", ["chunk_id"])


def downgrade() -> None:
    op.drop_table("message_citations")
    op.drop_table("messages")
    op.drop_table("conversations")
    op.drop_table("document_chunks")
    op.drop_table("documents")
    op.drop_table("faqs")
    op.drop_table("bots")
    op.drop_table("theme_presets")
    op.drop_table("users")
