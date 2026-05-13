import { useEffect, useState } from 'react'
import { fetchBot, updateBot } from '../lib/apiClient'
import type { Bot } from '../types/api'
import { FORM_FIELD_DEFS, mergeFormFields, type FormFieldConfig } from '../data/formFields'

export default function ContactPage() {
  const [bot, setBot] = useState<Bot | null>(null)
  const [form, setForm] = useState<Partial<Bot>>({})
  const [formFields, setFormFields] = useState<FormFieldConfig[]>(mergeFormFields(null))
  const [saving, setSaving] = useState(false)
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  useEffect(() => {
    fetchBot().then(b => {
      setBot(b); setForm(b)
      setFormFields(mergeFormFields(b.form_fields as FormFieldConfig[]))
    }).catch(() => {})
  }, [])

  const handleSave = async () => {
    if (!bot) return
    setSaving(true); setAlert(null)
    try {
      const updated = await updateBot({
        fallback_enabled: form.fallback_enabled,
        fallback_message: form.fallback_message,
        fallback_contact_url: form.fallback_contact_url,
        fallback_contact_email: form.fallback_contact_email,
        form_fields: formFields,
      })
      setBot(updated); setForm(updated)
      setFormFields(mergeFormFields(updated.form_fields as FormFieldConfig[]))
      setAlert({ type: 'success', msg: '保存しました。' })
    } catch {
      setAlert({ type: 'error', msg: '保存に失敗しました。' })
    } finally { setSaving(false) }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">問い合わせ設定</h1>
        <p className="page-desc">回答が見つからない場合のフォールバック動作を設定します。</p>
      </div>

      <div className="card">
        <div className="form-field">
          <label className="form-label">フォールバック機能</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <label className="toggle">
              <input type="checkbox" checked={!!form.fallback_enabled}
                onChange={e => setForm(f => ({ ...f, fallback_enabled: e.target.checked }))} />
              <span className="toggle-track" />
            </label>
            <span style={{ fontSize: 13, fontWeight: 500, color: form.fallback_enabled ? 'var(--green)' : 'var(--gray-500)' }}>
              {form.fallback_enabled ? '有効' : '無効'}
            </span>
          </div>
          <span className="form-hint">有効にすると、回答不能時にメッセージと連絡先を表示します。</span>
        </div>

        <hr className="divider" />

        <div className="form-field">
          <label className="form-label">フォールバックメッセージ</label>
          <textarea className="form-textarea" style={{ maxWidth: 560 }}
            value={form.fallback_message || ''}
            onChange={e => setForm(f => ({ ...f, fallback_message: e.target.value }))}
            placeholder="申し訳ございません。回答が見つかりませんでした。"
            disabled={!form.fallback_enabled} />
        </div>

        <div className="form-field">
          <label className="form-label">お問い合わせURL</label>
          <input className="form-input" style={{ maxWidth: 480 }} type="url"
            value={form.fallback_contact_url || ''}
            onChange={e => setForm(f => ({ ...f, fallback_contact_url: e.target.value }))}
            placeholder="https://example.com/contact"
            disabled={!form.fallback_enabled} />
        </div>

        <div className="form-field" style={{ marginBottom: 0 }}>
          <label className="form-label">お問い合わせメールアドレス</label>
          <input className="form-input" style={{ maxWidth: 360 }} type="email"
            value={form.fallback_contact_email || ''}
            onChange={e => setForm(f => ({ ...f, fallback_contact_email: e.target.value }))}
            placeholder="support@example.com"
            disabled={!form.fallback_enabled} />
        </div>
      </div>

      {/* 問い合わせフォーム項目設定 */}
      <div className="card" style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, color: 'var(--gray-800)' }}>問い合わせフォーム</h2>
        <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 16 }}>
          フォールバック時にチャット内に表示するフォームの項目を設定します。
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px', gap: 8, padding: '0 4px 8px', borderBottom: '1px solid var(--gray-100)' }}>
            <span style={{ fontSize: 12, color: 'var(--gray-500)', fontWeight: 600 }}>項目</span>
            <span style={{ fontSize: 12, color: 'var(--gray-500)', fontWeight: 600, textAlign: 'center' }}>表示</span>
            <span style={{ fontSize: 12, color: 'var(--gray-500)', fontWeight: 600, textAlign: 'center' }}>必須</span>
          </div>
          {FORM_FIELD_DEFS.map(def => {
            const field = formFields.find(f => f.key === def.key)!
            return (
              <div key={def.key} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px', gap: 8, alignItems: 'center', padding: '6px 4px' }}>
                <span style={{ fontSize: 14, color: 'var(--gray-700)' }}>{def.label}</span>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <label className="toggle">
                    <input type="checkbox" checked={field.enabled}
                      onChange={e => setFormFields(fs => fs.map(f => f.key === def.key ? { ...f, enabled: e.target.checked, required: e.target.checked ? f.required : false } : f))} />
                    <span className="toggle-track" />
                  </label>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <input type="checkbox" checked={field.required} disabled={!field.enabled}
                    onChange={e => setFormFields(fs => fs.map(f => f.key === def.key ? { ...f, required: e.target.checked } : f))}
                    style={{ width: 16, height: 16, cursor: field.enabled ? 'pointer' : 'default' }} />
                </div>
              </div>
            )
          })}
        </div>
        {formFields.every(f => !f.enabled) && (
          <p style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 12 }}>※ 項目をオンにするとフォールバック時にフォームが表示されます。</p>
        )}
      </div>

      {alert && <div className={`alert alert-${alert.type}`} style={{ marginTop: 16 }}>{alert.msg}</div>}

      <div style={{ marginTop: 20 }}>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving || !bot}>
          {saving ? '保存中...' : '💾 保存'}
        </button>
      </div>
    </div>
  )
}
