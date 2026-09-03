import api from '../lib/api'
import type { Bot, ThemePreset, FAQ, Document, ConversationSummary, ConversationDetail, ChatResponse, User, FormSubmission, TestQuestion, BotMember, BotSummary } from '../types/api'

// Extract a human-readable error message from an Axios error.
// Handles: Pydantic 422 arrays, custom {message:} objects, plain strings.
export function extractApiError(err: unknown, fallback = '操作に失敗しました。'): string {
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
  if (!detail) return fallback
  if (Array.isArray(detail)) return detail.map((d: { msg?: string }) => d.msg ?? '').filter(Boolean).join(' / ')
  if (typeof detail === 'object' && detail !== null) return (detail as { message?: string }).message ?? fallback
  if (typeof detail === 'string') return detail
  return fallback
}

// Auth
export const fetchMe = () => api.get<User>('/auth/me').then(r => r.data)
export const login = (email: string, password: string) =>
  api.post('/auth/login', { email, password }).then(r => r.data)
export const logout = () => api.post('/auth/logout')

// Bot
export const fetchBot = () => api.get<Bot>('/bot').then(r => r.data)
export const fetchBotList = () => api.get<BotSummary[]>('/bot/list').then(r => r.data)
export const createBot = (data: { chat_title: string; public_slug: string }) =>
  api.post<Bot>('/bot', data).then(r => r.data)
export const updateBot = (data: Partial<Bot>) => api.patch<Bot>('/bot', data).then(r => r.data)
export const deleteBot = () => api.delete('/bot')
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
export const exportFaqsCsv = () =>
  api.get('/faqs/export', { responseType: 'blob' }).then(r => r.data as Blob)
export const importFaqsCsv = (file: File) => {
  const form = new FormData()
  form.append('file', file)
  return api
    .post<{ created: number; skipped: number; errors: string[] }>('/faqs/import', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then(r => r.data)
}

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
export const fetchConversation = (id: string) =>
  api.get<ConversationDetail>(`/conversations/${id}`).then(r => r.data)

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

// Accuracy test
export const fetchTestQuestions = () =>
  api.get<TestQuestion[]>('/test-questions').then(r => r.data)
export const createTestQuestion = (data: { question: string; note?: string }) =>
  api.post<TestQuestion>('/test-questions', data).then(r => r.data)
export const updateTestQuestion = (id: string, data: { question?: string; note?: string }) =>
  api.patch<TestQuestion>(`/test-questions/${id}`, data).then(r => r.data)
export const deleteTestQuestion = (id: string) => api.delete(`/test-questions/${id}`)
export const runTestQuestions = () =>
  api.post<TestQuestion[]>('/test-questions/run').then(r => r.data)

// Bot members
export const fetchBotMembers = () =>
  api.get<BotMember[]>('/bot/members').then(r => r.data)
export const inviteBotMember = (email: string, role: 'owner' | 'editor') =>
  api.post<BotMember>('/bot/members', { email, role }).then(r => r.data)
export const updateBotMemberRole = (userId: string, role: 'owner' | 'editor') =>
  api.patch<BotMember>(`/bot/members/${userId}`, { role }).then(r => r.data)
export const removeBotMember = (userId: string) => api.delete(`/bot/members/${userId}`)
export const cancelBotInvite = (inviteId: string) => api.delete(`/bot/members/invites/${inviteId}`)
