import { useEffect, useState } from 'react'
import { fetchBot, updateBot, fetchThemes } from '../lib/apiClient'
import type { Bot, ThemePreset } from '../types/api'

export default function DesignPage() {
  const [bot, setBot] = useState<Bot | null>(null)
  const [themes, setThemes] = useState<ThemePreset[]>([])
  const [form, setForm] = useState<Partial<Bot>>({})
  const [saving, setSaving] = useState(false)
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  useEffect(() => {
    Promise.all([fetchBot().catch(() => null), fetchThemes()]).then(([b, t]) => {
      setThemes(t as ThemePreset[])
      if (b) { setBot(b as Bot); setForm(b as Bot) }
    })
  }, [])

  const selectedTheme = themes.find(t => t.id === form.theme_preset_id)

  const handleSave = async () => {
    if (!bot) return
    setSaving(true); setAlert(null)
    try {
      const updated = await updateBot({
        chat_title: form.chat_title,
        welcome_message: form.welcome_message,
        theme_preset_id: form.theme_preset_id,
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
        <h1 className="page-title">デザイン設定</h1>
        <p className="page-desc">チャット画面のテーマと表示内容を設定します。</p>
      </div>

      <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* ---- Form ---- */}
        <div style={{ flex: '1 1 360px', minWidth: 0 }}>
          <div className="card">
            {/* Theme selector */}
            <div className="form-field">
              <label className="form-label">テーマ</label>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
                {themes.map(t => (
                  <div
                    key={t.id}
                    onClick={() => setForm(f => ({ ...f, theme_preset_id: t.id }))}
                    style={{
                      border: form.theme_preset_id === t.id
                        ? `2px solid ${t.button_color}`
                        : '2px solid var(--gray-200)',
                      borderRadius: 10,
                      padding: '12px 14px',
                      cursor: 'pointer',
                      minWidth: 90,
                      background: form.theme_preset_id === t.id ? t.background_color : '#fff',
                      transition: 'border-color 0.15s',
                    }}
                  >
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%',
                      background: t.button_color, marginBottom: 6,
                      boxShadow: '0 1px 3px rgba(0,0,0,.15)',
                    }} />
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-700)' }}>{t.name}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="form-field">
              <label className="form-label">チャットタイトル</label>
              <input
                className="form-input"
                style={{ maxWidth: 360 }}
                value={form.chat_title || ''}
                onChange={e => setForm(f => ({ ...f, chat_title: e.target.value }))}
                placeholder="チャット"
              />
              <span className="form-hint">チャット画面のヘッダーに表示されます。</span>
            </div>

            <div className="form-field" style={{ marginBottom: 0 }}>
              <label className="form-label">初期メッセージ</label>
              <textarea
                className="form-textarea"
                style={{ maxWidth: 480 }}
                rows={3}
                value={form.welcome_message || ''}
                onChange={e => setForm(f => ({ ...f, welcome_message: e.target.value }))}
                placeholder="こんにちは！何かご質問はありますか？"
              />
              <span className="form-hint">チャット開始時にボットが最初に表示するメッセージです。</span>
            </div>
          </div>

          {alert && <div className={`alert alert-${alert.type}`} style={{ marginTop: 16 }}>{alert.msg}</div>}

          <div style={{ marginTop: 20 }}>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving || !bot}>
              {saving ? '保存中...' : '💾 保存'}
            </button>
          </div>
        </div>

        {/* ---- Preview ---- */}
        <div style={{ width: 300, flexShrink: 0, flexBasis: 300 }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--gray-400)', marginBottom: 10 }}>
            プレビュー
          </p>
          <div style={{
            border: '1px solid var(--gray-200)', borderRadius: 14,
            overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,.08)',
          }}>
            {/* Header */}
            <div style={{
              background: selectedTheme?.button_color || 'var(--brand)',
              color: '#fff', padding: '13px 16px',
              fontWeight: 600, fontSize: 14,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ fontSize: 16 }}>💬</span>
              {form.chat_title || 'チャット'}
            </div>
            {/* Body */}
            <div style={{
              background: selectedTheme?.background_color || 'var(--gray-50)',
              minHeight: 180, padding: 14,
            }}>
              {form.welcome_message ? (
                <div style={{
                  background: selectedTheme?.bubble_color || '#fff',
                  color: selectedTheme?.text_color || 'var(--gray-800)',
                  border: '1px solid var(--gray-200)',
                  borderRadius: '4px 12px 12px 12px',
                  padding: '8px 12px', fontSize: 13,
                  maxWidth: '85%', lineHeight: 1.5,
                }}>
                  {form.welcome_message}
                </div>
              ) : (
                <p style={{ color: 'var(--gray-400)', fontSize: 12, textAlign: 'center', marginTop: 40 }}>
                  初期メッセージが表示されます
                </p>
              )}
            </div>
            {/* Input */}
            <div style={{
              background: '#fff', borderTop: '1px solid var(--gray-200)',
              padding: '10px 12px', display: 'flex', gap: 8,
            }}>
              <input readOnly placeholder="メッセージを入力..." style={{
                flex: 1, border: '1px solid var(--gray-200)', borderRadius: 8,
                padding: '7px 10px', fontSize: 12, background: 'var(--gray-50)',
                outline: 'none',
              }} />
              <button style={{
                background: selectedTheme?.button_color || 'var(--brand)',
                color: '#fff', border: 'none', borderRadius: 8,
                padding: '7px 14px', fontSize: 12, cursor: 'default',
              }}>送信</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
