// API 型定義

export interface User {
  id: string
  email: string
  display_name: string
}

export interface Bot {
  id: string
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
  clarify_message: string | null
  persona: string | null
  status: string
  rag_score_threshold: number
  ai_model: string
  industry: string | null
  form_fields: FormFieldConfig[] | null
}

import type { FormFieldConfig } from '../data/formFields'
export type { FormFieldConfig }

export interface FormSubmission {
  id: string
  conversation_id: string | null
  data: Record<string, string>
  submitted_at: string
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
  created_at: string
}

export interface ConversationSummary {
  id: string
  started_at: string
  last_message_at: string
  latest_user_message: string | null
  latest_assistant_message: string | null
  fallback_triggered: boolean
  message_count: number
}

export interface ConversationMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  fallback_triggered: boolean
  created_at: string
}

export interface ConversationDetail {
  id: string
  started_at: string
  last_message_at: string
  messages: ConversationMessage[]
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

export interface TestQuestion {
  id: string
  question: string
  note: string | null
  last_answer: string | null
  last_fallback: boolean | null
  last_score: number | null
  last_run_at: string | null
}

export interface BotMember {
  status: 'active' | 'pending'
  user_id: string | null
  invite_id: string | null
  email: string
  display_name: string | null
  role: 'owner' | 'editor'
  is_me: boolean
  created_at: string
}

export interface BotSummary {
  id: string
  chat_title: string
  public_slug: string
  is_public: boolean
  role: 'owner' | 'editor'
}
