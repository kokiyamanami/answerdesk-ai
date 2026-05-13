import { useState, useRef, useEffect } from 'react'
import { sendTestMessage } from '../lib/apiClient'
import type { ChatResponse } from '../types/api'

interface Message {
  role: 'user' | 'assistant'
  content: string
  fallback?: boolean
  citations?: ChatResponse['citations']
  contact?: ChatResponse['contact']
}

export default function TestChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    setMessages(m => [...m, { role: 'user', content: text }])
    setSending(true)
    try {
      const res = await sendTestMessage(text)
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)' }}>
      <h1 style={{ fontSize: 22, marginBottom: 16 }}>テストチャット</h1>

      {/* Chat messages */}
      <div style={{
        flex: 1, overflowY: 'auto', border: '1px solid #e2e8f0',
        borderRadius: 8, padding: 16, background: '#f8fafc',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        {messages.length === 0 && (
          <p style={{ color: '#94a3b8', fontSize: 14, textAlign: 'center', marginTop: 40 }}>
            質問を入力してください。
          </p>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
          }}>
            <div style={{
              maxWidth: '70%',
              background: msg.role === 'user' ? '#2563eb' : '#fff',
              color: msg.role === 'user' ? '#fff' : '#1e293b',
              border: msg.role === 'assistant' ? '1px solid #e2e8f0' : 'none',
              borderRadius: msg.role === 'user' ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
              padding: '10px 14px', fontSize: 14, lineHeight: 1.6,
            }}>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{msg.content}</p>
              {msg.fallback && (
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #e2e8f0', fontSize: 12, color: '#64748b' }}>
                  <span style={{ color: '#f59e0b', fontWeight: 600 }}>⚠ 回答が見つかりませんでした</span>
                  {msg.contact?.url && (
                    <div style={{ marginTop: 4 }}>
                      <a href={msg.contact.url} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>
                        お問い合わせ →
                      </a>
                    </div>
                  )}
                  {msg.contact?.email && (
                    <div><a href={`mailto:${msg.contact.email}`} style={{ color: '#2563eb' }}>{msg.contact.email}</a></div>
                  )}
                </div>
              )}
              {!msg.fallback && msg.citations && msg.citations.length > 0 && (
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #e2e8f0', fontSize: 12, color: '#64748b' }}>
                  <span style={{ fontWeight: 600 }}>参照元:</span>
                  {msg.citations.map((c, ci) => (
                    <div key={ci}>{c.source_kind === 'faq' ? '📋 FAQ' : '📄 ドキュメント'}{c.title ? `: ${c.title}` : ''}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {sending && (
          <div style={{ display: 'flex' }}>
            <div style={{
              background: '#fff', border: '1px solid #e2e8f0',
              borderRadius: '4px 12px 12px 12px', padding: '10px 14px', fontSize: 14, color: '#94a3b8',
            }}>
              回答中...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <textarea
          rows={2}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="質問を入力... (Enter で送信)"
          style={{
            flex: 1, border: '1px solid #e2e8f0', borderRadius: 8,
            padding: '10px 12px', fontSize: 14, resize: 'none',
          }}
        />
        <button onClick={send} disabled={sending || !input.trim()} style={{
          padding: '0 20px', background: '#2563eb', color: '#fff',
          border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14,
          opacity: sending || !input.trim() ? 0.5 : 1,
        }}>
          送信
        </button>
      </div>
    </div>
  )
}
