import api from '../lib/api'
import type { Bot, ThemePreset, FAQ, Document, ConversationSummary, ChatResponse, User, FormSubmission } from '../types/api'

// Auth
export const fetchMe = () => api.get<User>('/auth/me').then(r => r.data)
export const login = (email: string, password: string) =>
  api.post('/auth/login', { email, password }).then(r => r.data)
export const logout = () => api.post('/auth/logout')

// Bot
export const fetchBot = () => api.get<Bot>('/bot').then(r => r.data)
export const createBot = (data: { chat_title: string; public_slug: string }) =>
  api.post<Bot>('/bot', data).then(r => r.data)
export const updateBot = (data: Partial<Bot>) => api.patch<Bot>('/bot', data).then(r => r.data)
export const checkSlug = (value: string) =>
  api.get<{ value: string; available: boolean }>(`/bot/slug/check?value=${value}`).then(r => r.data)
export const uploadBotIcon = (file: File) => {
  const form = new FormData()
  form.append('file', file)
  return api.post<Bot>('/bot/icon', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data)
}

// Theme
export const fetchThemes = () => api.get<ThemePreset[]>('/theme-presets').then(r => r.data)

// FAQ
export const fetchFaqs = () => api.get<FAQ[]>('/faqs').then(r => r.data)
export const createFaq = (data: { question: string; answer: string; category?: string; sort_order?: number }) =>
  api.post<FAQ>('/faqs', data).then(r => r.data)
export const updateFaq = (id: string, data: Partial<FAQ>) =>
  api.patch<FAQ>(`/faqs/${id}`, data).then(r => r.data)
export const deleteFaq = (id: string) => api.delete(`/faqs/${id}`)

// Document
export const fetchDocuments = () => api.get<Document[]>('/documents').then(r => r.data)
export const uploadDocument = (file: File) => {
  const form = new FormData()
  form.append('file', file)
  return api.post<Document>('/documents/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data)
}
export const deleteDocument = (id: string) => api.delete(`/documents/${id}`)

// Conversations
export const fetchConversations = () =>
  api.get<ConversationSummary[]>('/conversations').then(r => r.data)

// Form Submissions (admin)
export const fetchFormSubmissions = () =>
  api.get<FormSubmission[]>('/form-submissions').then(r => r.data)

// Public Chat
export const fetchPublicBot = (slug: string) =>
  api.get(`/public/bots/${slug}`).then(r => r.data)
export const createPublicConversation = (slug: string) =>
  api.post<{ conversation_id: string }>(`/public/bots/${slug}/conversations`).then(r => r.data)
export const sendPublicMessage = (slug: string, conversationId: string, message: string) =>
  api.post<ChatResponse>(`/public/bots/${slug}/messages`, { conversation_id: conversationId, message }).then(r => r.data)
export const submitPublicForm = (slug: string, conversationId: string | null, data: Record<string, string>) =>
  api.post(`/public/bots/${slug}/form-submissions`, { conversation_id: conversationId, data }).then(r => r.data)
