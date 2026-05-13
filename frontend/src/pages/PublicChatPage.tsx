import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import {
  fetchPublicBot,
  createPublicConversation,
  sendPublicMessage,
  submitPublicForm,
} from '../lib/apiClient'
import type { ChatResponse } from '../types/api'
import { FORM_FIELD_DEFS, type FormFieldConfig } from '../data/formFields'

interface BotInfo {
  name: string
  chat_title: string
  icon_url: string | null
  welcome_message: string | null
  form_fields: FormFieldConfig[] | null
  theme: {
    background_color: string
    button_color: string
    bubble_color: string
    text_color: string
  } | null
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  fallback?: boolean
  citations?: ChatResponse['citations']
  contact?: ChatResponse['contact']
  showForm?: boolean
}

function TypingIndicator({ color }: { color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '12px 16px' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 7, height: 7, borderRadius: '50%',
          background: color, opacity: 0.5,
          display: 'inline-block',
          animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

export default function PublicChatPage() {
  const { slug } = useParams<{ slug: string }>()
  const [bot, setBot] = useState<BotInfo | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [formValues, setFormValues] = useState<Record<number, Record<string, string>>>({})
  const [formSubmitted, setFormSubmitted] = useState<Set<number>>(new Set())
  const [formSubmitting, setFormSubmitting] = useState<number | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!slug) return
    fetchPublicBot(slug)
      .then(b => {
        setBot(b as BotInfo)
        if ((b as BotInfo).welcome_message) {
          setMessages([{ role: 'assistant', content: (b as BotInfo).welcome_message! }])
        }
      })
      .catch(() => setNotFound(true))
  }, [slug])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }, [input])

  const ensureConversation = async (): Promise<string> => {
    if (conversationId) return conversationId
    const res = await createPublicConversation(slug!)
    setConversationId(res.conversation_id)
    return res.conversation_id
  }

  const send = async () => {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    setMessages(m => [...m, { role: 'user', content: text }])
    setSending(true)
    try {
      const convId = await ensureConversation()
      const res = await sendPublicMessage(slug!, convId, text)
      const enabledFields = (bot as BotInfo | null)?.form_fields?.filter(f => f.enabled) ?? []
      setMessages(m => [...m, {
        role: 'assistant',
        content: res.answer,
        fallback: res.fallback,
        citations: res.citations,
        contact: res.contact,
        showForm: res.fallback && enabledFields.length > 0,
      }])
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'エラーが発生しました。しばらくしてから再度お試しください。' }])
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const handleFormSubmit = async (msgIndex: number) => {
    const values = formValues[msgIndex] ?? {}
    const enabledFields = bot?.form_fields?.filter(f => f.enabled) ?? []
    const hasRequired = enabledFields.filter(f => f.required).every(f => (values[f.key] ?? '').trim())
    if (!hasRequired) return
    setFormSubmitting(msgIndex)
    try {
      await submitPublicForm(slug!, conversationId, values)
      setFormSubmitted(prev => new Set(prev).add(msgIndex))
    } finally {
      setFormSubmitting(null)
    }
  }

  const theme = bot?.theme
  const primaryColor = theme?.button_color || '#4f46e5'
  const bgColor = theme?.background_color || '#f8fafc'
  const bubbleColor = theme?.bubble_color || '#ffffff'
  const textColor = theme?.text_color || '#1e293b'

  if (notFound) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', flexDirection: 'column', gap: 12,
        background: '#f8fafc',
      }}>
        <div style={{ fontSize: 48 }}>🔍</div>
        <p style={{ fontSize: 16, color: '#64748b', margin: 0 }}>ボットが見つかりません。</p>
        <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>URLをご確認ください。</p>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100dvh',
      width: '100%',
      fontFamily: "'Hiragino Sans','Noto Sans JP',system-ui,sans-serif",
      background: bgColor,
    }}>

      {/* Header */}
      <div style={{
        background: primaryColor, color: '#fff',
        padding: '0 20px', height: 60,
        display: 'flex', alignItems: 'center', gap: 12,
        boxShadow: '0 2px 12px rgba(0,0,0,.15)',
        flexShrink: 0,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'rgba(255,255,255,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', flexShrink: 0,
        }}>
          {bot?.icon_url
            ? <img src={bot.icon_url} alt="icon" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontSize: 18 }}>💬</span>
          }
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.3 }}>
            {bot?.chat_title || bot?.name || ''}
          </div>
          <div style={{ fontSize: 11, opacity: 0.8, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
            オンライン
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: '20px 16px',
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex',
            flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
            alignItems: 'flex-end', gap: 8,
          }}>
            {msg.role === 'assistant' && (
              <div style={{
                width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                background: primaryColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,.1)',
              }}>
                {bot?.icon_url
                  ? <img src={bot.icon_url} alt="bot" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: 14 }}>💬</span>
                }
              </div>
            )}
            <div style={{
              maxWidth: '72%',
              background: msg.role === 'user' ? primaryColor : bubbleColor,
              color: msg.role === 'user' ? '#fff' : textColor,
              borderRadius: msg.role === 'user' ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
              padding: '10px 16px', fontSize: 14, lineHeight: 1.65,
              boxShadow: msg.role === 'user'
                ? `0 2px 10px ${primaryColor}55`
                : '0 1px 4px rgba(0,0,0,.06)',
              border: msg.role === 'assistant' ? '1px solid rgba(0,0,0,.06)' : 'none',
            }}>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{msg.content}</p>

              {/* フォールバック時インラインフォーム */}
              {msg.showForm && (() => {
                const enabledFields = bot?.form_fields?.filter(f => f.enabled) ?? []
                if (formSubmitted.has(i)) {
                  return (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(0,0,0,.08)', fontSize: 13, color: '#15803d' }}>
                      ✅ 送信しました。担当者よりご連絡いたします。
                    </div>
                  )
                }
                return (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(0,0,0,.08)' }}>
                    <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 600, color: textColor }}>お問い合わせフォーム</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {FORM_FIELD_DEFS.filter(def => enabledFields.some(f => f.key === def.key)).map(def => {
                        const field = enabledFields.find(f => f.key === def.key)!
                        const val = formValues[i]?.[def.key] ?? ''
                        const isTextarea = def.key === 'body'
                        const inputStyle: React.CSSProperties = {
                          width: '100%', boxSizing: 'border-box',
                          padding: '7px 10px', fontSize: 13,
                          border: '1px solid rgba(0,0,0,.15)', borderRadius: 8,
                          background: '#fff', color: '#1e293b',
                          fontFamily: 'inherit', outline: 'none', resize: 'vertical' as const,
                        }
                        return (
                          <div key={def.key}>
                            <label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(0,0,0,.5)', display: 'block', marginBottom: 3 }}>
                              {def.label}{field.required && <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>}
                            </label>
                            {isTextarea
                              ? <textarea rows={3} style={inputStyle} value={val}
                                  onChange={e => setFormValues(v => ({ ...v, [i]: { ...v[i], [def.key]: e.target.value } }))} />
                              : <input type={def.key === 'email' ? 'email' : def.key === 'phone' ? 'tel' : 'text'}
                                  style={inputStyle} value={val}
                                  onChange={e => setFormValues(v => ({ ...v, [i]: { ...v[i], [def.key]: e.target.value } }))} />
                            }
                          </div>
                        )
                      })}
                    </div>
                    <button
                      onClick={() => handleFormSubmit(i)}
                      disabled={formSubmitting === i}
                      style={{
                        marginTop: 10, padding: '8px 18px', fontSize: 13, fontWeight: 600,
                        background: primaryColor, color: '#fff', border: 'none',
                        borderRadius: 8, cursor: formSubmitting === i ? 'default' : 'pointer',
                        opacity: formSubmitting === i ? 0.7 : 1,
                      }}
                    >
                      {formSubmitting === i ? '送信中...' : '送信する'}
                    </button>
                  </div>
                )
              })()}

              {/* フォームがない場合の連絡先リンク */}
              {msg.fallback && !msg.showForm && (msg.contact?.url || msg.contact?.email) && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(0,0,0,.08)', fontSize: 12 }}>
                  {msg.contact?.url && (
                    <a href={msg.contact.url} target="_blank" rel="noreferrer"
                      style={{ color: primaryColor, textDecoration: 'none', fontWeight: 600 }}>
                      お問い合わせはこちら →
                    </a>
                  )}
                  {msg.contact?.email && (
                    <a href={`mailto:${msg.contact.email}`} style={{ color: primaryColor, textDecoration: 'none' }}>
                      {msg.contact.email}
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {sending && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8, flexShrink: 0,
              background: primaryColor,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
            }}>
              {bot?.icon_url
                ? <img src={bot.icon_url} alt="bot" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: 14 }}>💬</span>
              }
            </div>
            <div style={{
              background: bubbleColor, border: '1px solid rgba(0,0,0,.06)',
              borderRadius: '4px 18px 18px 18px',
              boxShadow: '0 1px 4px rgba(0,0,0,.06)',
            }}>
              <TypingIndicator color={primaryColor} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '12px 16px 20px',
        background: '#fff',
        borderTop: '1px solid rgba(0,0,0,.07)',
        boxShadow: '0 -4px 20px rgba(0,0,0,.05)',
        flexShrink: 0,
      }}>
        <div style={{
          display: 'flex', gap: 8, alignItems: 'flex-end',
          background: '#f1f5f9', borderRadius: 16,
          padding: '6px 6px 6px 16px',
        }}>
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="メッセージを入力..."
            style={{
              flex: 1, border: 'none', background: 'transparent',
              fontSize: 14, lineHeight: 1.5, resize: 'none',
              outline: 'none', padding: '6px 0', color: '#1e293b',
              maxHeight: 120, fontFamily: 'inherit',
            }}
          />
          <button
            onClick={send}
            disabled={sending || !input.trim()}
            style={{
              width: 40, height: 40, borderRadius: 12,
              background: sending || !input.trim() ? '#cbd5e1' : primaryColor,
              color: '#fff', border: 'none',
              cursor: sending || !input.trim() ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'background 0.15s',
              fontSize: 18, fontWeight: 700,
            }}
          >↑</button>
        </div>

      </div>
    </div>
  )
}
