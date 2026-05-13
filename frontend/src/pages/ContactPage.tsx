import { useEffect, useState } from 'react'
import { fetchBot, updateBot } from '../lib/apiClient'
import type { Bot } from '../types/api'

export default function ContactPage() {
  const [bot, setBot] = useState<Bot | null>(null)
  const [form, setForm] = useState<Partial<Bot>>({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    fetchBot().then(b => { setBot(b); setForm(b) }).catch(() => {})
  }, [])

  const handleSave = async () => {
    if (!bot) return
    setSaving(true)
    setMessage(null)
    try {
      const updated = await updateBot({
        fallback_enabled: form.fallback_enabled,
        fallback_message: form.fallback_message,
        fallback_contact_url: form.fallback_contact_url,
        fallback_contact_email: form.fallback_contact_email,
      })
      setBot(updated)
      setForm(updated)
      setMessage('保存しました。')
    } catch {
      setMessage('保存に失敗しました。')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <h1 style={{ fontSize: 22, marginBottom: 8 }}>お問い合わせ設定</h1>
      <p style={{ fontSize: 13, color: '#64748b', marginBottom: 24 }}>
        回答が見つからなかった際に表示するフォールバックメッセージと連絡先を設定します。
      </p>

      <Field label="フォールバックを有効にする">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
          <input
            type="checkbox"
            checked={!!form.fallback_enabled}
            onChange={e => setForm(f => ({ ...f, fallback_enabled: e.target.checked }))}
          />
          有効
        </label>
      </Field>

      <Field label="フォールバックメッセージ">
        <textarea
          rows={3}
          value={form.fallback_message || ''}
          onChange={e => setForm(f => ({ ...f, fallback_message: e.target.value }))}
          placeholder="申し訳ございません。回答が見つかりませんでした。"
          disabled={!form.fallback_enabled}
          style={{ resize: 'vertical' }}
        />
      </Field>

      <Field label="お問い合わせURL">
        <input
          type="url"
          value={form.fallback_contact_url || ''}
          onChange={e => setForm(f => ({ ...f, fallback_contact_url: e.target.value }))}
          placeholder="https://example.com/contact"
          disabled={!form.fallback_enabled}
        />
      </Field>

      <Field label="お問い合わせメールアドレス">
        <input
          type="email"
          value={form.fallback_contact_email || ''}
          onChange={e => setForm(f => ({ ...f, fallback_contact_email: e.target.value }))}
          placeholder="support@example.com"
          disabled={!form.fallback_enabled}
        />
      </Field>

      {message && <p style={{ color: message.includes('失敗') ? 'red' : 'green', marginBottom: 12 }}>{message}</p>}

      <button onClick={handleSave} disabled={saving || !bot} style={primaryBtn}>
        {saving ? '保存中...' : '保存'}
      </button>
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

const primaryBtn: React.CSSProperties = {
  padding: '10px 24px', background: '#2563eb', color: '#fff',
  border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14,
}
