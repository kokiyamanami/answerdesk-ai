import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { fetchFaqs, createFaq, updateFaq, deleteFaq, fetchBot } from '../lib/apiClient'
import type { FAQ } from '../types/api'
import { INDUSTRIES, FAQ_TEMPLATES, type FAQTemplate } from '../data/faqTemplates'
import UpgradeModal from '../components/UpgradeModal'

const FAQ_LIMIT = 20

function TemplateModal({ industry, onClose, onAdd }: {
  industry: string
  onClose: () => void
  onAdd: (selected: FAQTemplate[]) => Promise<void>
}) {
  const templates = FAQ_TEMPLATES[industry] ?? []
  const industryLabel = INDUSTRIES.find(i => i.value === industry)?.label ?? industry
  const [checked, setChecked] = useState<boolean[]>(templates.map(() => false))
  const [adding, setAdding] = useState(false)

  const toggle = (i: number) => setChecked(c => c.map((v, j) => j === i ? !v : v))
  const toggleAll = () => {
    const allOn = checked.every(Boolean)
    setChecked(templates.map(() => !allOn))
  }
  const selectedItems = templates.filter((_, i) => checked[i])

  const handleAdd = async () => {
    setAdding(true)
    await onAdd(selectedItems)
    setAdding(false)
    onClose()
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 16,
        width: '100%', maxWidth: 560,
        boxShadow: '0 20px 60px rgba(0,0,0,.2)',
        display: 'flex', flexDirection: 'column', maxHeight: '80vh',
      }}>
        <div style={{ padding: '24px 28px 16px', borderBottom: '1px solid var(--gray-100)' }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--gray-900)', marginBottom: 4 }}>
            {industryLabel}のFAQテンプレート
          </h2>
          <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>追加したいFAQを選択してください。</p>
        </div>

        <div style={{ padding: '12px 28px', borderBottom: '1px solid var(--gray-100)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--gray-600)' }}>
            <input type="checkbox" checked={checked.every(Boolean)} onChange={toggleAll} />
            すべて選択
          </label>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {templates.map((t, i) => (
            <label key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              padding: '14px 28px', borderBottom: '1px solid var(--gray-50)',
              cursor: 'pointer',
              background: checked[i] ? '#f5f7ff' : '#fff',
            }}>
              <input type="checkbox" checked={checked[i]} onChange={() => toggle(i)} style={{ marginTop: 3, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-800)', marginBottom: 3 }}>{t.question}</div>
                <div style={{ fontSize: 12, color: 'var(--gray-500)', lineHeight: 1.6 }}>{t.answer}</div>
                <span style={{ fontSize: 11, color: 'var(--brand)', marginTop: 4, display: 'inline-block' }}>{t.category}</span>
              </div>
            </label>
          ))}
        </div>

        <div style={{ padding: '16px 28px', borderTop: '1px solid var(--gray-100)', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>キャンセル</button>
          <button
            className="btn btn-primary"
            onClick={handleAdd}
            disabled={selectedItems.length === 0 || adding}
          >
            {adding ? '追加中...' : `${selectedItems.length}件を追加`}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function FAQPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([])
  const [loading, setLoading] = useState(true)
  const [industry, setIndustry] = useState<string | null>(null)
  const [showTemplate, setShowTemplate] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([
      fetchFaqs().catch(() => [] as FAQ[]),
      fetchBot().catch(() => null),
    ]).then(([faqs, bot]) => {
      setFaqs(faqs)
      setIndustry(bot?.industry ?? null)
    }).finally(() => setLoading(false))
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('このFAQを削除しますか？')) return
    await deleteFaq(id)
    setFaqs(f => f.filter(x => x.id !== id))
  }

  const handleAddTemplates = async (selected: import('../data/faqTemplates').FAQTemplate[]) => {
    const created = await Promise.all(
      selected.map(t => createFaq({ question: t.question, answer: t.answer, category: t.category }))
    )
    setFaqs(f => [...f, ...created])
  }

  const atLimit = faqs.length >= FAQ_LIMIT

  return (
    <>
      {showTemplate && industry && (
        <TemplateModal
          industry={industry}
          onClose={() => setShowTemplate(false)}
          onAdd={handleAddTemplates}
        />
      )}
      {showUpgradeModal && <UpgradeModal onClose={() => setShowUpgradeModal(false)} />}
      <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">FAQ管理</h1>
          <p className="page-desc">よくある質問と回答を管理します。</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: atLimit ? 'var(--red)' : 'var(--gray-400)' }}>
            {faqs.length} / {FAQ_LIMIT}件
          </span>
          {industry && (
            <button className="btn btn-secondary"
              onClick={() => atLimit ? setShowUpgradeModal(true) : setShowTemplate(true)}>
              📋 テンプレートから追加
            </button>
          )}
          <button className="btn btn-primary"
            onClick={() => atLimit ? setShowUpgradeModal(true) : navigate('/app/faqs/new')}>
            ＋ 新規追加
          </button>
        </div>
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
    </>
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
        await updateFaq(id!, { question: form.question, answer: form.answer, category: form.category || undefined })
      } else {
        await createFaq({ question: form.question, answer: form.answer, category: form.category || undefined })
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
