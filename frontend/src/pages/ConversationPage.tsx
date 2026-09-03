import { useEffect, useState } from 'react'
import { fetchConversations, fetchConversation } from '../lib/apiClient'
import type { ConversationSummary, ConversationDetail } from '../types/api'
import Pagination, { usePagination } from '../components/Pagination'

export default function ConversationPage() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState<string | null>(null)
  const [detail, setDetail] = useState<ConversationDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const pg = usePagination(conversations, 20)

  useEffect(() => {
    fetchConversations().then(res => setConversations(res)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const toggle = async (id: string) => {
    if (openId === id) { setOpenId(null); setDetail(null); return }
    setOpenId(id); setDetail(null); setDetailLoading(true)
    try {
      setDetail(await fetchConversation(id))
    } catch {
      setDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">会話ログ</h1>
        <p className="page-desc">セッションごとの会話履歴です。行を開くと全メッセージを確認できます。</p>
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
          {pg.pageItems.map(c => {
            const isOpen = openId === c.id
            return (
              <div key={c.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <button
                  onClick={() => toggle(c.id)}
                  style={{
                    width: '100%', textAlign: 'left', background: 'transparent', border: 'none',
                    cursor: 'pointer', padding: '16px 20px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16,
                  }}
                >
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
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {c.fallback_triggered && <span className="badge badge-amber">フォールバック</span>}
                      <span className="badge badge-gray">{c.message_count} メッセージ</span>
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>
                      {new Date(c.last_message_at).toLocaleString('ja-JP')}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--brand)' }}>{isOpen ? '閉じる ▲' : '全文を見る ▼'}</span>
                  </div>
                </button>

                {isOpen && (
                  <div style={{ borderTop: '1px solid var(--gray-100)', padding: '16px 20px', background: 'var(--gray-50)' }}>
                    {detailLoading ? (
                      <p style={{ color: 'var(--gray-400)', fontSize: 13 }}>読み込み中...</p>
                    ) : !detail ? (
                      <p style={{ color: 'var(--gray-400)', fontSize: 13 }}>取得できませんでした。</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {detail.messages.map(m => (
                          <div
                            key={m.id}
                            style={{
                              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                              maxWidth: '80%',
                              background: m.role === 'user' ? 'var(--brand)' : '#fff',
                              color: m.role === 'user' ? '#fff' : 'var(--gray-800)',
                              border: m.role === 'user' ? 'none' : '1px solid var(--gray-200)',
                              borderRadius: 10, padding: '8px 12px', fontSize: 13, lineHeight: 1.6,
                              whiteSpace: 'pre-wrap',
                            }}
                          >
                            {m.content}
                            {m.fallback_triggered && (
                              <span className="badge badge-amber" style={{ marginLeft: 8, verticalAlign: 'middle' }}>
                                フォールバック
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      <Pagination page={pg.page} pageCount={pg.pageCount} onChange={pg.setPage} total={pg.total} />
    </div>
  )
}
