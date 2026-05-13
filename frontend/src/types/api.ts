// API 型定義

export interface User {
  id: string
  email: string
  display_name: string
}

export interface Bot {
  id: string
  name: string
  public_slug: string
  is_public: boolean
  chat_title: string
  icon_url: string | null
  welcome_message: string | null
  theme_preset_id: string | null
  fallback_enabled: boolean
  fallback_message: string
  fallback_contact_url: string | null
  fallback_contact_email: string | null
  status: string
}

export interface ThemePreset {
  id: string
  code: string
  name: string
  background_color: string
  button_color: string
  bubble_color: string
  text_color: string
  muted_text_color: string | null
  border_color: string | null
  sort_order: number
}

export interface FAQ {
  id: string
  question: string
  answer: string
  category: string | null
  sort_order: number
  is_active: boolean
}

export interface Document {
  id: string
  file_name: string
  mime_type: string
  file_size_bytes: number
  status: 'uploaded' | 'processing' | 'processed' | 'failed'
  error_message: string | null
  chunk_count: number | null
  created_at: string
}

export interface ConversationSummary {
  id: string
  started_at: string
  last_message_at: string
  latest_user_message: string | null
  latest_assistant_message: string | null
  fallback_triggered: boolean
}

export interface ChatCitation {
  title: string | null
  source_kind: string
}

export interface ChatResponse {
  answer: string
  fallback: boolean
  citations: ChatCitation[]
  contact?: { url: string | null; email: string | null }
}
