import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import {
  fetchPublicBot,
  createPublicConversation,
  sendPublicMessage,
} from '../lib/apiClient'
import type { ChatResponse } from '../types/api'

interface BotInfo {
  name: string
  chat_title: string
  welcome_message: string | null
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
}

export default function PublicChatPage() {
  const { slug } = useParams<{ slug: string }>()
  const [bot, setBot] = useState<BotInfo | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!slug) return
    fetchPublicBot(slug)
      .then(b => {
        setBot(b as BotInfo)
        if (b.welcome_message) {
          setMessages([{ role: 'assistant', content: b.welcome_message }])
        }
      })
      .catch(() => setNotFound(true))
  }, [slug])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
      setMessages(m => [...m, {
        role: 'assistant',
        content: res.answer,
        fallback: res.fallback,
        citations: res.citations,
        contact: res.contact,
      }])
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'エラーが発生しました。' }])
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const theme = bot?.theme
  const primaryColor = theme?.button_color || '#2563eb'
  const bgColor = theme?.background_color || '#f8fafc'
  const bubbleColor = theme?.bubble_color || '#fff'
  const textColor = theme?.text_color || '#1e293b'

  if (notFound) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column' }}>
        <p style={{ fontSize: 18, color: '#64748b' }}>ボットが見つかりません。</p>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      maxWidth: 640, margin: '0 auto',
    }}>
      {/* Header */}
      <div style={{ background: primaryColor, color: '#fff', padding: '16px 20px', fontWeight: 600, fontSize: 16 }}>
        {bot?.chat_title || bot?.name || ''}
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: 'auto', background: bgColor,
        padding: 16, display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
          }}>
            <div style={{
              maxWidth: '75%',
              background: msg.role === 'user' ? primaryColor : bubbleColor,
              color: msg.role === 'user' ? '#fff' : textColor,
              border: msg.role === 'assistant' ? '1px solid #e2e8f0' : 'none',
              borderRadius: msg.role === 'user' ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
              padding: '10px 14px', fontSize: 14, lineHeight: 1.6,
            }}>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{msg.content}</p>
              {msg.fallback && (
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #e2e8f0', fontSize: 12, color: '#64748b' }}>
                  {msg.contact?.url && (
                    <a href={msg.contact.url} target="_blank" rel="noreferrer" style={{ color: primaryColor, display: 'block' }}>
                      お問い合わせはこちら →
                    </a>
                  )}
                  {msg.contact?.email && (
                    <a href={`mailto:${msg.contact.email}`} style={{ color: primaryColor }}>{msg.contact.email}</a>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {sending && (
          <div style={{ display: 'flex' }}>
            <div style={{
              background: bubbleColor, border: '1px solid #e2e8f0',
              borderRadius: '4px 12px 12px 12px', padding: '10px 14px', fontSize: 14, color: '#94a3b8',
            }}>
              ...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        display: 'flex', gap: 8, padding: 12,
        background: '#fff', borderTop: '1px solid #e2e8f0',
      }}>
        <textarea
          rows={1}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="メッセージを入力..."
          style={{
            flex: 1, border: '1px solid #e2e8f0', borderRadius: 8,
            padding: '8px 12px', fontSize: 14, resize: 'none',
          }}
        />
        <button onClick={send} disabled={sending || !input.trim()} style={{
          padding: '0 20px', background: primaryColor, color: '#fff',
          border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14,
          opacity: sending || !input.trim() ? 0.5 : 1,
        }}>
          送信
        </button>
      </div>
    </div>
  )
}
