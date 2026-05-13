import { useEffect, useState } from 'react'
import { fetchConversations } from '../lib/apiClient'
import type { ConversationSummary } from '../types/api'

export default function ConversationPage() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchConversations().then(res => setConversations(res)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">会話ログ</h1>
        <p className="page-desc">ユーザーとの会話履歴を確認できます。</p>
      </div>

      {loading ? (
        <p style={{ color: 'var(--gray-400)' }}>読み込み中...</p>
      ) : conversations.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--gray-400)' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🗂️</div>
          <p>会話がまだありません。</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {conversations.map(c => (
            <div key={c.id} className="card" style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {c.latest_user_message && (
                    <p style={{ margin: '0 0 4px', fontWeight: 500, color: 'var(--gray-800)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      Q: {c.latest_user_message}
                    </p>
                  )}
                  {c.latest_assistant_message && (
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--gray-500)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      A: {c.latest_assistant_message}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                  {c.fallback_triggered && <span className="badge badge-amber">フォールバック</span>}
                  <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>
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
