import { useEffect, useState } from 'react'
import { fetchBot, updateBot } from '../lib/apiClient'
import type { Bot } from '../types/api'

export default function ContactPage() {
  const [bot, setBot] = useState<Bot | null>(null)
  const [form, setForm] = useState<Partial<Bot>>({})
  const [saving, setSaving] = useState(false)
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  useEffect(() => {
    fetchBot().then(b => { setBot(b); setForm(b) }).catch(() => {})
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
      })
      setBot(updated); setForm(updated)
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

      {alert && <div className={`alert alert-${alert.type}`} style={{ marginTop: 16 }}>{alert.msg}</div>}

      <div style={{ marginTop: 20 }}>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving || !bot}>
          {saving ? '保存中...' : '💾 保存'}
        </button>
      </div>
    </div>
  )
}
