import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { fetchFaqs, createFaq, updateFaq, deleteFaq } from '../lib/apiClient'
import type { FAQ } from '../types/api'

export default function FAQPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetchFaqs().then(res => setFaqs(res)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('このFAQを削除しますか？')) return
    await deleteFaq(id)
    setFaqs(f => f.filter(x => x.id !== id))
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">FAQ管理</h1>
          <p className="page-desc">よくある質問と回答を管理します。</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/app/faqs/new')}>＋ 新規追加</button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <p style={{ padding: 24, color: 'var(--gray-400)' }}>読み込み中...</p>
        ) : faqs.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--gray-400)' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
            <p>FAQがありません。「新規追加」から作成してください。</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>質問</th>
                <th style={{ width: 140 }}>カテゴリ</th>
                <th style={{ width: 100 }}></th>
              </tr>
            </thead>
            <tbody>
              {faqs.map(faq => (
                <tr key={faq.id}>
                  <td>{faq.question}</td>
                  <td>{faq.category ? <span className="badge badge-indigo">{faq.category}</span> : <span style={{ color: 'var(--gray-400)' }}>—</span>}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/app/faqs/${faq.id}/edit`)}>編集</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(faq.id)}>削除</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export function FAQFormPage() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const [form, setForm] = useState({ question: '', answer: '', category: '' })
  const [saving, setSaving] = useState(false)
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  useEffect(() => {
    if (!isEdit) return
    fetchFaqs().then(faqs => {
      const faq = faqs.find(f => f.id === id)
      if (faq) setForm({ question: faq.question, answer: faq.answer, category: faq.category || '' })
    })
  }, [id, isEdit])

  const handleSave = async () => {
    if (!form.question.trim() || !form.answer.trim()) {
      setAlert({ type: 'error', msg: '質問と回答は必須です。' }); return
    }
    setSaving(true); setAlert(null)
    try {
      if (isEdit) {
        await updateFaq(id!, { question: form.question, answer: form.answer, category: form.category || null })
      } else {
        await createFaq({ question: form.question, answer: form.answer, category: form.category || null })
      }
      navigate('/app/faqs')
    } catch {
      setAlert({ type: 'error', msg: '保存に失敗しました。' })
    } finally { setSaving(false) }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{isEdit ? 'FAQ編集' : 'FAQ新規作成'}</h1>
      </div>

      <div className="card">
        <div className="form-field">
          <label className="form-label">質問 <span style={{ color: 'var(--red)' }}>*</span></label>
          <textarea className="form-textarea" style={{ maxWidth: 640, minHeight: 72 }}
            value={form.question} onChange={e => setForm(f => ({ ...f, question: e.target.value }))} />
        </div>

        <div className="form-field">
          <label className="form-label">回答 <span style={{ color: 'var(--red)' }}>*</span></label>
          <textarea className="form-textarea" style={{ maxWidth: 640, minHeight: 140 }}
            value={form.answer} onChange={e => setForm(f => ({ ...f, answer: e.target.value }))} />
        </div>

        <div className="form-field" style={{ marginBottom: 0 }}>
          <label className="form-label">カテゴリ（任意）</label>
          <input className="form-input" style={{ maxWidth: 280 }}
            value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            placeholder="例: 料金, 使い方" />
        </div>
      </div>

      {alert && <div className={`alert alert-${alert.type}`} style={{ marginTop: 16 }}>{alert.msg}</div>}

      <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? '保存中...' : '💾 保存'}
        </button>
        <button className="btn btn-secondary" onClick={() => navigate('/app/faqs')}>キャンセル</button>
      </div>
    </div>
  )
}
