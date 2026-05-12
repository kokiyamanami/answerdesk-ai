-- AnswerDesk AI PostgreSQL DDL
-- Based on docs/db-design.md

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_users_email_lowercase CHECK (email = lower(email))
);

CREATE TABLE theme_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  background_color CHAR(7) NOT NULL,
  button_color CHAR(7) NOT NULL,
  bubble_color CHAR(7) NOT NULL,
  text_color CHAR(7) NOT NULL,
  muted_text_color CHAR(7),
  border_color CHAR(7),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE bots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  public_slug VARCHAR(50) NOT NULL UNIQUE,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  chat_title VARCHAR(255) NOT NULL,
  icon_url TEXT,
  welcome_message TEXT,
  theme_preset_id UUID REFERENCES theme_presets(id) ON DELETE SET NULL,
  fallback_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  fallback_message TEXT NOT NULL,
  fallback_contact_url TEXT,
  fallback_contact_email VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_bots_status CHECK (status IN ('active', 'inactive')),
  CONSTRAINT chk_bots_public_slug_format CHECK (public_slug ~ '^[a-z0-9](?:[a-z0-9-]{1,48}[a-z0-9])?$')
);

CREATE TABLE faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category VARCHAR(100),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  source_type VARCHAR(50) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  storage_url TEXT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'uploaded',
  error_message TEXT,
  processed_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_documents_source_type CHECK (source_type IN ('pdf')),
  CONSTRAINT chk_documents_status CHECK (status IN ('uploaded', 'processing', 'processed', 'failed')),
  CONSTRAINT chk_documents_file_size_positive CHECK (file_size_bytes > 0)
);

CREATE TABLE document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  source_kind VARCHAR(50) NOT NULL,
  source_id UUID NOT NULL,
  chunk_index INTEGER NOT NULL,
  title VARCHAR(255),
  content TEXT NOT NULL,
  metadata_json JSONB,
  embedding vector(1536) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_document_chunks_source_kind CHECK (source_kind IN ('faq', 'document')),
  CONSTRAINT chk_document_chunks_chunk_index_non_negative CHECK (chunk_index >= 0)
);

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  session_token VARCHAR(255) NOT NULL UNIQUE,
  channel VARCHAR(50) NOT NULL DEFAULT 'public_web',
  started_at TIMESTAMP NOT NULL,
  last_message_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_conversations_channel CHECK (channel IN ('public_web', 'admin_test'))
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,
  message_type VARCHAR(30) NOT NULL DEFAULT 'normal',
  content TEXT NOT NULL,
  retrieval_score NUMERIC(8,5),
  fallback_triggered BOOLEAN NOT NULL DEFAULT FALSE,
  model_name VARCHAR(100),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_messages_role CHECK (role IN ('user', 'assistant', 'system')),
  CONSTRAINT chk_messages_message_type CHECK (message_type IN ('normal', 'fallback'))
);

CREATE TABLE message_citations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  chunk_id UUID NOT NULL REFERENCES document_chunks(id) ON DELETE CASCADE,
  rank_order INTEGER NOT NULL,
  score NUMERIC(8,5),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_message_citations_rank_order_positive CHECK (rank_order > 0)
);

CREATE INDEX idx_bots_public_slug ON bots(public_slug);
CREATE INDEX idx_faqs_bot_id ON faqs(bot_id);
CREATE INDEX idx_documents_bot_id ON documents(bot_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_document_chunks_bot_id ON document_chunks(bot_id);
CREATE INDEX idx_document_chunks_source ON document_chunks(source_kind, source_id);
CREATE INDEX idx_conversations_bot_id ON conversations(bot_id);
CREATE INDEX idx_conversations_session_token ON conversations(session_token);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_bot_id ON messages(bot_id);
CREATE INDEX idx_message_citations_message_id ON message_citations(message_id);
CREATE INDEX idx_message_citations_chunk_id ON message_citations(chunk_id);

-- pgvector similarity index example
-- Adjust operator class according to similarity strategy
CREATE INDEX idx_document_chunks_embedding_ivfflat
  ON document_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
