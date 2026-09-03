import { useEffect, useState } from 'react'
import { fetchBot, fetchThemes, updateBot, extractApiError } from '../lib/apiClient'
import type { Bot, ThemePreset } from '../types/api'
import { FORM_FIELD_DEFS, mergeFormFields, type FormFieldConfig } from '../data/formFields'

export default function ContactPage() {
  const [bot, setBot] = useState<Bot | null>(null)
  const [themes, setThemes] = useState<ThemePreset[]>([])
  const [form, setForm] = useState<Partial<Bot>>({})
  const [formFields, setFormFields] = useState<FormFieldConfig[]>(mergeFormFields(null))
  const [saving, setSaving] = useState(false)
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  useEffect(() => {
    Promise.all([fetchBot().catch(() => null), fetchThemes()]).then(([b, t]) => {
      setThemes(t as ThemePreset[])
      if (b) {
        setBot(b as Bot); setForm(b as Bot)
        setFormFields(mergeFormFields((b as Bot).form_fields as FormFieldConfig[]))
      }
    })
  }, [])

  const handleSave = async () => {
    if (!bot) return
    setSaving(true); setAlert(null)
    try {
      const updated = await updateBot({
        fallback_enabled: form.fallback_enabled,
        fallback_message: form.fallback_message,
        clarify_message: form.clarify_message,
        fallback_contact_url: form.fallback_contact_url,
        fallback_contact_email: form.fallback_contact_email,
        form_fields: formFields,
      })
      setBot(updated); setForm(updated)
      setFormFields(mergeFormFields(updated.form_fields as FormFieldConfig[]))
      setAlert({ type: 'success', msg: '保存しました。' })
    } catch (err) {
      setAlert({ type: 'error', msg: extractApiError(err, '保存に失敗しました。') })
    } finally { setSaving(false) }
  }

  const selectedTheme = themes.find(t => t.id === form.theme_preset_id)
  const primaryColor = selectedTheme?.button_color || '#4f46e5'
  const bgColor = selectedTheme?.background_color || '#f8fafc'
  const bubbleColor = selectedTheme?.bubble_color || '#ffffff'
  const textColor = selectedTheme?.text_color || '#1e293b'
  const enabledFields = formFields.filter(f => f.enabled)

  return (
    <>
    <div>
      <div className="page-header">
        <h1 className="page-title">問い合わせ設定</h1>
        <p className="page-desc">回答が見つからない場合のフォールバック動作を設定します。</p>
      </div>

      <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* ---- Form ---- */}
        <div style={{ flex: '1 1 360px', minWidth: 0 }}>
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
              <label className="form-label">聞き返しメッセージ</label>
              <textarea className="form-textarea" style={{ maxWidth: 560 }}
                value={form.clarify_message || ''}
                onChange={e => setForm(f => ({ ...f, clarify_message: e.target.value }))}
                placeholder="ご質問の意図をもう少し詳しく教えていただけますか？（対象や状況など）" />
              <span className="form-hint">
                回答が見つからなかった時、いきなり問い合わせ誘導せず一度だけこの文で聞き返します。それでも見つからなければ下のフォールバックに進みます。空欄なら既定文を使用。
              </span>
            </div>

            <div className="form-field">
              <label className="form-label">フォールバックメッセージ</label>
              <textarea className="form-textarea" style={{ maxWidth: 560 }}
                value={form.fallback_message || ''}
                onChange={e => setForm(f => ({ ...f, fallback_message: e.target.value }))}
                placeholder="申し訳ございません。回答が見つかりませんでした。"
                disabled={!form.fallback_enabled} />
            </div>

            <div className="form-field">
              <label className="form-label">外部問い合わせページURL</label>
              <input className="form-input" style={{ maxWidth: 480 }} type="url"
                value={form.fallback_contact_url || ''}
                onChange={e => setForm(f => ({ ...f, fallback_contact_url: e.target.value }))}
                placeholder="https://example.com/contact"
                disabled={!form.fallback_enabled} />
              <span className="form-hint">フォールバック時にチャット内へ「お問い合わせはこちら →」のリンクとして表示されます。</span>
            </div>

            <div className="form-field" style={{ marginBottom: 0 }}>
              <label className="form-label">フォーム通知メールアドレス</label>
              <input className="form-input" style={{ maxWidth: 360 }}
                type="email"
                value={form.fallback_contact_email || ''}
                onChange={e => setForm(f => ({ ...f, fallback_contact_email: e.target.value }))}
                placeholder="例: info@yourcompany.com" />
              <span className="form-hint">
                フォールバック時にチャット内へ問い合わせ先メールとして表示されます。
              </span>
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
            {enabledFields.length === 0 && (
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

        {/* ---- Preview ---- */}
        <div style={{ width: 300, flexShrink: 0, flexBasis: 300 }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--gray-400)', marginBottom: 10 }}>
            プレビュー
          </p>
          <div style={{
            border: '1px solid var(--gray-200)', borderRadius: 14,
            overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,.08)',
            display: 'flex', flexDirection: 'column',
            fontFamily: "'Hiragino Sans','Noto Sans JP',system-ui,sans-serif",
          }}>
            {/* Header */}
            <div style={{
              background: primaryColor, color: '#fff',
              padding: '0 14px', height: 52,
              display: 'flex', alignItems: 'center', gap: 10,
              boxShadow: '0 2px 8px rgba(0,0,0,.12)', flexShrink: 0,
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
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
                <div style={{ fontWeight: 700, fontSize: 13 }}>{form.chat_title || 'チャット'}</div>
                <div style={{ fontSize: 10, opacity: 0.8, display: 'flex', alignItems: 'center', gap: 3 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
                  オンライン
                </div>
              </div>
            </div>

            {/* Body */}
            <div style={{
              background: bgColor, padding: 14,
              display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              {/* User message */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{
                  background: primaryColor, color: '#fff',
                  borderRadius: '18px',
                  padding: '7px 11px', fontSize: 11, lineHeight: 1.6, maxWidth: '80%',
                }}>
                  サービスについて教えてください
                </div>
              </div>

              {/* Fallback bot message */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                  background: primaryColor,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden',
                }}>
                  {form.icon_url
                    ? <img src={form.icon_url} alt="bot" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: 12 }}>💬</span>
                  }
                </div>
                <div style={{
                  background: bubbleColor || '#f3f4f6', color: textColor,
                  border: 'none',
                  borderRadius: '18px',
                  padding: '8px 11px', fontSize: 11, lineHeight: 1.6,
                  maxWidth: '85%',
                }}>
                  <p style={{ margin: 0 }}>
                    {form.fallback_message || '申し訳ありませんが、お答えできませんでした。お問い合わせください。'}
                  </p>

                  {/* Inline form preview */}
                  {enabledFields.length > 0 && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(0,0,0,.08)' }}>
                      <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, color: textColor }}>お問い合わせフォーム</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {enabledFields.map(f => (
                          <div key={f.key}>
                            <div style={{ fontSize: 9, fontWeight: 600, color: 'rgba(0,0,0,.45)', marginBottom: 2 }}>
                              {f.label}{f.required && <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>}
                            </div>
                            <div style={{
                              height: f.key === 'body' ? 36 : 22,
                              background: 'rgba(0,0,0,.04)',
                              border: '1px solid rgba(0,0,0,.1)',
                              borderRadius: 5,
                            }} />
                          </div>
                        ))}
                      </div>
                      <div style={{
                        marginTop: 8, padding: '5px 10px',
                        background: primaryColor, color: '#fff',
                        borderRadius: 6, fontSize: 10, fontWeight: 600,
                        display: 'inline-block',
                      }}>送信する</div>
                    </div>
                  )}

                  {/* Contact links (when no form) */}
                  {enabledFields.length === 0 && (form.fallback_contact_url || form.fallback_contact_email) && (
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(0,0,0,.08)', fontSize: 10 }}>
                      {form.fallback_contact_url && (
                        <div style={{ color: primaryColor, fontWeight: 600 }}>お問い合わせはこちら →</div>
                      )}
                      {form.fallback_contact_email && (
                        <div style={{ color: primaryColor, marginTop: 2 }}>{form.fallback_contact_email}</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Input */}
            <div style={{
              padding: '10px 12px', background: '#fff',
              borderTop: '1px solid rgba(0,0,0,.07)',
              boxShadow: '0 -3px 12px rgba(0,0,0,.04)', flexShrink: 0,
            }}>
              <div style={{
                display: 'flex', gap: 6, alignItems: 'center',
                background: '#ffffff', borderRadius: 12,
                border: '1.5px solid #e5e7eb',
                padding: '5px 5px 5px 12px',
              }}>
                <span style={{ flex: 1, fontSize: 11, color: '#94a3b8' }}>メッセージを入力...</span>
                <div style={{
                  width: 30, height: 30, borderRadius: 15,
                  background: primaryColor,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 14, fontWeight: 700,
                }}>↑</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}
