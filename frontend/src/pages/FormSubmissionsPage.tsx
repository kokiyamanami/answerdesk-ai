import { useEffect, useState } from 'react'
import { fetchFormSubmissions } from '../lib/apiClient'
import type { FormSubmission } from '../types/api'
import { FORM_FIELD_DEFS } from '../data/formFields'

export default function FormSubmissionsPage() {
  const [submissions, setSubmissions] = useState<FormSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    fetchFormSubmissions().then(setSubmissions).catch(() => {}).finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">問い合わせフォーム送信</h1>
        <p className="page-desc">フォールバック時に送信されたお問い合わせ一覧です。</p>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <p style={{ padding: 24, color: 'var(--gray-400)' }}>読み込み中...</p>
        ) : submissions.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--gray-400)' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📬</div>
            <p>まだ送信はありません。</p>
          </div>
        ) : (
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
              {submissions.map(s => (
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
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
