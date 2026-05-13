import { useEffect, useState } from 'react'
import { fetchBot, updateBot, fetchThemes } from '../lib/apiClient'
import type { Bot, ThemePreset } from '../types/api'

export default function DesignPage() {
  const [bot, setBot] = useState<Bot | null>(null)
  const [themes, setThemes] = useState<ThemePreset[]>([])
  const [form, setForm] = useState<Partial<Bot>>({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([fetchBot().catch(() => null), fetchThemes()]).then(([b, t]) => {
      setThemes(t)
      if (b) { setBot(b); setForm(b) }
    })
  }, [])

  const selectedTheme = themes.find(t => t.id === form.theme_preset_id)

  const handleSave = async () => {
    if (!bot) return
    setSaving(true)
    setMessage(null)
    try {
      const updated = await updateBot({
        chat_title: form.chat_title,
        welcome_message: form.welcome_message,
        theme_preset_id: form.theme_preset_id,
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
    <div style={{ display: 'flex', gap: 40 }}>
      {/* Form */}
      <div style={{ flex: 1, maxWidth: 480 }}>
        <h1 style={{ fontSize: 22, marginBottom: 24 }}>デザイン設定</h1>

        <Field label="テーマ">
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {themes.map(t => (
              <div
                key={t.id}
                onClick={() => setForm(f => ({ ...f, theme_preset_id: t.id }))}
                style={{
                  border: form.theme_preset_id === t.id ? `2px solid ${t.button_color}` : '2px solid #e2e8f0',
                  borderRadius: 8, padding: '12px 16px', cursor: 'pointer', minWidth: 100,
                  background: form.theme_preset_id === t.id ? t.background_color : '#fff',
                }}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: '50%',
                  background: t.button_color, marginBottom: 6,
                }} />
                <div style={{ fontSize: 12, fontWeight: 600 }}>{t.name}</div>
              </div>
            ))}
          </div>
        </Field>

        <Field label="チャットタイトル">
          <input
            value={form.chat_title || ''}
            onChange={e => setForm(f => ({ ...f, chat_title: e.target.value }))}
          />
        </Field>

        <Field label="初期メッセージ">
          <textarea
            rows={3}
            value={form.welcome_message || ''}
            onChange={e => setForm(f => ({ ...f, welcome_message: e.target.value }))}
            placeholder="こんにちは！何かご質問はありますか？"
            style={{ resize: 'vertical' }}
          />
        </Field>

        {message && <p style={{ color: message.includes('失敗') ? 'red' : 'green', marginBottom: 12 }}>{message}</p>}

        <button onClick={handleSave} disabled={saving || !bot} style={primaryBtn}>
          {saving ? '保存中...' : '保存'}
        </button>
      </div>

      {/* Preview */}
      <div style={{ width: 320 }}>
        <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: '#374151' }}>プレビュー</p>
        <div style={{
          border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(0,0,0,.08)',
        }}>
          {/* Header */}
          <div style={{
            background: selectedTheme?.button_color || '#2563eb',
            color: '#fff', padding: '14px 16px', fontWeight: 600, fontSize: 15,
          }}>
            {form.chat_title || 'チャット'}
          </div>
          {/* Chat body */}
          <div style={{
            background: selectedTheme?.background_color || '#f8fafc',
            minHeight: 200, padding: 16,
          }}>
            {form.welcome_message && (
              <div style={{
                background: selectedTheme?.button_color || '#2563eb',
                color: '#fff', borderRadius: '4px 12px 12px 12px',
                padding: '8px 12px', fontSize: 13, maxWidth: '80%',
              }}>
                {form.welcome_message}
              </div>
            )}
          </div>
          {/* Input */}
          <div style={{
            background: '#fff', borderTop: '1px solid #e2e8f0',
            padding: '10px 12px', display: 'flex', gap: 8,
          }}>
            <input readOnly placeholder="メッセージを入力..." style={{
              flex: 1, border: '1px solid #e2e8f0', borderRadius: 6,
              padding: '6px 10px', fontSize: 13,
            }} />
            <button style={{
              background: selectedTheme?.button_color || '#2563eb', color: '#fff',
              border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 13,
            }}>送信</button>
          </div>
        </div>
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

const primaryBtn: React.CSSProperties = {
  padding: '10px 24px', background: '#2563eb', color: '#fff',
  border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14,
}
