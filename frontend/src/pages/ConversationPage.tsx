import { useEffect, useState } from 'react'
import { fetchConversations } from '../lib/apiClient'
import type { ConversationSummary } from '../types/api'

export default function ConversationPage() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchConversations()
      .then(res => setConversations(res))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <h1 style={{ fontSize: 22, marginBottom: 24 }}>会話ログ</h1>

      {loading ? (
        <p style={{ color: '#64748b' }}>読み込み中...</p>
      ) : conversations.length === 0 ? (
        <p style={{ color: '#64748b' }}>会話がありません。</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {conversations.map(c => (
            <div key={c.id} style={{
              border: '1px solid #e2e8f0', borderRadius: 8, padding: 16,
              background: '#fff',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  {c.latest_user_message && (
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: '#1e293b', marginBottom: 4 }}>
                      Q: {c.latest_user_message.length > 80 ? c.latest_user_message.slice(0, 80) + '...' : c.latest_user_message}
                    </p>
                  )}
                  {c.latest_assistant_message && (
                    <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
                      A: {c.latest_assistant_message.length > 100 ? c.latest_assistant_message.slice(0, 100) + '...' : c.latest_assistant_message}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, marginLeft: 16 }}>
                  {c.fallback_triggered && (
                    <span style={{
                      background: '#fef3c7', color: '#d97706', fontSize: 11,
                      padding: '2px 8px', borderRadius: 10, fontWeight: 600,
                    }}>
                      フォールバック
                    </span>
                  )}
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>
                    {new Date(c.last_message_at).toLocaleString('ja-JP')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
