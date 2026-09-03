import { useEffect, useState } from 'react'
import { fetchFormSubmissions, fetchConversation } from '../lib/apiClient'
import type { FormSubmission, ConversationDetail } from '../types/api'
import { FORM_FIELD_DEFS } from '../data/formFields'
import Pagination, { usePagination } from '../components/Pagination'

function ConversationTranscript({ id }: { id: string }) {
  const [detail, setDetail] = useState<ConversationDetail | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    fetchConversation(id).then(setDetail).catch(() => setDetail(null)).finally(() => setLoading(false))
  }, [id])

  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--gray-200)' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', marginBottom: 6 }}>会話ログ</div>
      {loading ? (
        <div style={{ fontSize: 13, color: 'var(--gray-400)' }}>読み込み中...</div>
      ) : !detail || detail.messages.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--gray-400)' }}>会話はありません。</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {detail.messages.map(m => (
            <div key={m.id} style={{
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '80%', fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap',
              background: m.role === 'user' ? 'var(--brand)' : '#fff',
              color: m.role === 'user' ? '#fff' : 'var(--gray-800)',
              border: m.role === 'user' ? 'none' : '1px solid var(--gray-200)',
              borderRadius: 10, padding: '6px 10px',
            }}>{m.content}</div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function FormSubmissionsPage() {
  const [submissions, setSubmissions] = useState<FormSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const pg = usePagination(submissions, 20)

  useEffect(() => {
    fetchFormSubmissions().then(setSubmissions).catch(() => {}).finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">問い合わせフォーム送信</h1>
        <p className="page-desc">チャットから送信されたお問い合わせ一覧です（「スタッフに問い合わせ」ボタン / フォールバック時のフォーム）。</p>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <p style={{ padding: 24, color: 'var(--gray-400)' }}>読み込み中...</p>
        ) : submissions.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--gray-400)' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📬</div>
            <p>まだ送信はありません。</p>
          </div>
        ) : (<>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 160 }}>送信日時</th>
                <th>お名前</th>
                <th>メールアドレス</th>
                <th>件名</th>
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {pg.pageItems.map(s => (
                <>
                  <tr key={s.id}>
                    <td style={{ color: 'var(--gray-500)' }}>{new Date(s.submitted_at).toLocaleString('ja-JP')}</td>
                    <td>{s.data.name ?? <span style={{ color: 'var(--gray-400)' }}>—</span>}</td>
                    <td>{s.data.email ?? <span style={{ color: 'var(--gray-400)' }}>—</span>}</td>
                    <td>{s.data.subject ?? <span style={{ color: 'var(--gray-400)' }}>—</span>}</td>
                    <td>
                      <button className="btn btn-secondary btn-sm"
                        onClick={() => setExpanded(expanded === s.id ? null : s.id)}>
                        {expanded === s.id ? '閉じる' : '詳細'}
                      </button>
                    </td>
                  </tr>
                  {expanded === s.id && (
                    <tr key={`${s.id}-detail`}>
                      <td colSpan={5} style={{ background: 'var(--gray-50)', padding: '16px 24px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {FORM_FIELD_DEFS.map(def => {
                            const val = s.data[def.key]
                            if (val == null) return null
                            return (
                              <div key={def.key}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', marginBottom: 2 }}>{def.label}</div>
                                <div style={{ fontSize: 14, color: 'var(--gray-800)', whiteSpace: 'pre-wrap' }}>{val}</div>
                              </div>
                            )
                          })}
                          {s.conversation_id && <ConversationTranscript id={s.conversation_id} />}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        <Pagination page={pg.page} pageCount={pg.pageCount} onChange={pg.setPage} total={pg.total} />
        </>
        )}
      </div>
    </div>
  )
}
