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
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 52px)' }}>
      <div className="page-header" style={{ marginBottom: 16 }}>
        <h1 className="page-title">テストチャット</h1>
        <p className="page-desc">実際の応答をリアルタイムで確認できます。</p>
      </div>

      {/* Chat messages */}
      <div className="card" style={{
        flex: 1, overflowY: 'auto', padding: 20,
        display: 'flex', flexDirection: 'column', gap: 14,
        minHeight: 0,
      }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: 60, color: 'var(--gray-400)' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🧪</div>
            <p style={{ fontSize: 14 }}>質問を入力してください。</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
          }}>
            <div style={{
              maxWidth: '72%',
              background: msg.role === 'user' ? 'var(--brand)' : 'var(--gray-50)',
              color: msg.role === 'user' ? '#fff' : 'var(--gray-800)',
              border: msg.role === 'assistant' ? '1px solid var(--gray-200)' : 'none',
              borderRadius: msg.role === 'user' ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
              padding: '10px 14px', fontSize: 14, lineHeight: 1.65,
            }}>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{msg.content}</p>
              {msg.fallback && (
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--gray-200)', fontSize: 12 }}>
                  <span style={{ color: 'var(--amber)', fontWeight: 600 }}>⚠ 回答が見つかりませんでした</span>
                  {msg.contact?.url && (
                    <div style={{ marginTop: 4 }}>
                      <a href={msg.contact.url} target="_blank" rel="noreferrer" style={{ color: 'var(--brand)' }}>
                        お問い合わせ →
                      </a>
                    </div>
                  )}
                  {msg.contact?.email && (
                    <div><a href={`mailto:${msg.contact.email}`} style={{ color: 'var(--brand)' }}>{msg.contact.email}</a></div>
                  )}
                </div>
              )}
              {!msg.fallback && msg.citations && msg.citations.length > 0 && (
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--gray-200)', fontSize: 12, color: 'var(--gray-500)' }}>
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
              background: 'var(--gray-50)',
              border: '1px solid var(--gray-200)',
              borderRadius: '4px 12px 12px 12px',
              padding: '10px 14px', fontSize: 14, color: 'var(--gray-400)',
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
          className="form-textarea"
          style={{ flex: 1, resize: 'none' }}
        />
        <button
          onClick={send}
          disabled={sending || !input.trim()}
          className="btn btn-primary"
          style={{ alignSelf: 'stretch', paddingLeft: 24, paddingRight: 24 }}
        >
          送信
        </button>
      </div>
    </div>
  )
}

