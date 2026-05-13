import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { fetchFaqs, createFaq, updateFaq, deleteFaq } from '../lib/apiClient'
import type { FAQ } from '../types/api'

export default function FAQPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFaqs()
      .then(res => { setFaqs(res) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('削除しますか？')) return
    await deleteFaq(id)
    setFaqs(f => f.filter(x => x.id !== id))
  }

  const navigate = useNavigate()

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22 }}>FAQ管理</h1>
        <button onClick={() => navigate('/app/faqs/new')} style={primaryBtn}>+ 新規追加</button>
      </div>

      {loading ? (
        <p style={{ color: '#64748b' }}>読み込み中...</p>
      ) : faqs.length === 0 ? (
        <p style={{ color: '#64748b' }}>FAQがありません。</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
              <Th>質問</Th>
              <Th>カテゴリ</Th>
              <Th width={120}></Th>
            </tr>
          </thead>
          <tbody>
            {faqs.map(faq => (
              <tr key={faq.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={td}>{faq.question}</td>
                <td style={{ ...td, color: '#64748b' }}>{faq.category || '—'}</td>
                <td style={{ ...td, display: 'flex', gap: 8 }}>
                  <button onClick={() => navigate(`/app/faqs/${faq.id}/edit`)} style={outlineBtn}>編集</button>
                  <button onClick={() => handleDelete(faq.id)} style={dangerBtn}>削除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export function FAQFormPage() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const [form, setForm] = useState({ question: '', answer: '', category: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isEdit) return
    fetchFaqs().then(faqs => {
      const faq = faqs.find(f => f.id === id)
      if (faq) setForm({ question: faq.question, answer: faq.answer, category: faq.category || '' })
    })
  }, [id, isEdit])

  const handleSave = async () => {
    if (!form.question.trim() || !form.answer.trim()) {
      setError('質問と回答は必須です。'); return
    }
    setSaving(true); setError(null)
    try {
      if (isEdit) {
        await updateFaq(id!, { question: form.question, answer: form.answer, category: form.category || null })
      } else {
        await createFaq({ question: form.question, answer: form.answer, category: form.category || null })
      }
      navigate('/app/faqs')
    } catch {
      setError('保存に失敗しました。')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <h1 style={{ fontSize: 22, marginBottom: 24 }}>{isEdit ? 'FAQ編集' : 'FAQ新規作成'}</h1>

      <Field label="質問">
        <textarea
          rows={2}
          value={form.question}
          onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
          style={{ resize: 'vertical' }}
        />
      </Field>

      <Field label="回答">
        <textarea
          rows={5}
          value={form.answer}
          onChange={e => setForm(f => ({ ...f, answer: e.target.value }))}
          style={{ resize: 'vertical' }}
        />
      </Field>

      <Field label="カテゴリ（任意）">
        <input
          value={form.category}
          onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
          placeholder="例: 料金, 使い方"
        />
      </Field>

      {error && <p style={{ color: 'red', marginBottom: 12 }}>{error}</p>}

      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={handleSave} disabled={saving} style={primaryBtn}>
          {saving ? '保存中...' : '保存'}
        </button>
        <button onClick={() => navigate('/app/faqs')} style={outlineBtn}>キャンセル</button>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#374151' }}>{label}</label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>{children}</div>
    </div>
  )
}

function Th({ children, width }: { children?: React.ReactNode; width?: number }) {
  return (
    <th style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13, borderBottom: '2px solid #e2e8f0', width }}>
      {children}
    </th>
  )
}

const td: React.CSSProperties = { padding: '10px 12px', verticalAlign: 'middle' }
const primaryBtn: React.CSSProperties = {
  padding: '8px 20px', background: '#2563eb', color: '#fff',
  border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14,
}
const outlineBtn: React.CSSProperties = {
  padding: '6px 14px', background: '#fff', color: '#374151',
  border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', fontSize: 13,
}
const dangerBtn: React.CSSProperties = {
  padding: '6px 14px', background: '#fff', color: '#dc2626',
  border: '1px solid #fecaca', borderRadius: 6, cursor: 'pointer', fontSize: 13,
}
