import { useEffect, useRef, useState } from 'react'
import { fetchBot, updateBot, fetchThemes, uploadBotIcon } from '../lib/apiClient'
import type { Bot, ThemePreset } from '../types/api'

export default function DesignPage() {
  const [bot, setBot] = useState<Bot | null>(null)
  const [themes, setThemes] = useState<ThemePreset[]>([])
  const [form, setForm] = useState<Partial<Bot>>({})
  const [saving, setSaving] = useState(false)
  const [iconUploading, setIconUploading] = useState(false)
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const iconInputRef = useRef<HTMLInputElement>(null)

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

  const handleIconChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIconUploading(true); setAlert(null)
    try {
      const updated = await uploadBotIcon(file)
      setBot(updated); setForm(updated)
      setAlert({ type: 'success', msg: 'アイコンを更新しました。' })
    } catch {
      setAlert({ type: 'error', msg: 'アイコンのアップロードに失敗しました。' })
    } finally {
      setIconUploading(false)
      if (iconInputRef.current) iconInputRef.current.value = ''
    }
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
            {/* Icon upload */}
            <div className="form-field">
              <label className="form-label">アイコン画像</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 12,
                  border: '1px solid var(--gray-200)',
                  background: 'var(--gray-50)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden', flexShrink: 0,
                }}>
                  {form.icon_url
                    ? <img src={form.icon_url} alt="icon" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: 28 }}>💬</span>
                  }
                </div>
                <div>
                  <input
                    ref={iconInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                    style={{ display: 'none' }}
                    onChange={handleIconChange}
                  />
                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: 13 }}
                    disabled={iconUploading || !bot}
                    onClick={() => iconInputRef.current?.click()}
                  >
                    {iconUploading ? 'アップロード中...' : '画像を選択'}
                  </button>
                  <p className="form-hint" style={{ marginTop: 6 }}>JPEG / PNG / GIF / WebP / SVG、2MB以内</p>
                </div>
              </div>
            </div>

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
            display: 'flex', flexDirection: 'column', height: 420,
            fontFamily: "'Hiragino Sans','Noto Sans JP',system-ui,sans-serif",
          }}>
            {/* Header */}
            <div style={{
              background: selectedTheme?.button_color || 'var(--brand)',
              color: '#fff', padding: '0 14px', height: 52,
              display: 'flex', alignItems: 'center', gap: 10,
              boxShadow: '0 2px 8px rgba(0,0,0,.12)',
              flexShrink: 0,
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: 8,
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', flexShrink: 0,
              }}>
                {form.icon_url
                  ? <img src={form.icon_url} alt="icon" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: 15 }}>💬</span>
                }
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.3 }}>
                  {form.chat_title || 'チャット'}
                </div>
                <div style={{ fontSize: 10, opacity: 0.8, display: 'flex', alignItems: 'center', gap: 3 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
                  オンライン
                </div>
              </div>
            </div>
            {/* Body */}
            <div style={{
              flex: 1, overflowY: 'auto',
              background: selectedTheme?.background_color || '#f8fafc',
              padding: 14,
              display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              {form.welcome_message ? (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                    background: selectedTheme?.button_color || 'var(--brand)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden',
                  }}>
                    {form.icon_url
                      ? <img src={form.icon_url} alt="bot" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontSize: 12 }}>💬</span>
                    }
                  </div>
                  <div style={{
                    background: selectedTheme?.bubble_color || '#ffffff',
                    color: selectedTheme?.text_color || '#1e293b',
                    border: '1px solid rgba(0,0,0,.06)',
                    borderRadius: '4px 14px 14px 14px',
                    padding: '8px 12px', fontSize: 12, lineHeight: 1.6,
                    maxWidth: '80%',
                    boxShadow: '0 1px 3px rgba(0,0,0,.05)',
                  }}>
                    {form.welcome_message}
                  </div>
                </div>
              ) : (
                <p style={{ color: 'var(--gray-400)', fontSize: 11, textAlign: 'center', marginTop: 40 }}>
                  初期メッセージが表示されます
                </p>
              )}
              {/* Sample user message */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{
                  background: selectedTheme?.button_color || 'var(--brand)',
                  color: '#fff',
                  borderRadius: '14px 4px 14px 14px',
                  padding: '8px 12px', fontSize: 12, lineHeight: 1.6,
                  maxWidth: '72%',
                  boxShadow: `0 2px 8px ${selectedTheme?.button_color || '#4f46e5'}44`,
                }}>
                  質問があります
                </div>
              </div>
            </div>
            {/* Input */}
            <div style={{
              padding: '10px 12px',
              background: '#fff',
              borderTop: '1px solid rgba(0,0,0,.07)',
              boxShadow: '0 -3px 12px rgba(0,0,0,.04)',
              flexShrink: 0,
            }}>
              <div style={{
                display: 'flex', gap: 6, alignItems: 'center',
                background: '#f1f5f9', borderRadius: 12,
                padding: '5px 5px 5px 12px',
              }}>
                <span style={{ flex: 1, fontSize: 11, color: '#94a3b8' }}>メッセージを入力...</span>
                <div style={{
                  width: 30, height: 30, borderRadius: 9,
                  background: selectedTheme?.button_color || 'var(--brand)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 14, fontWeight: 700,
                }}>↑</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
