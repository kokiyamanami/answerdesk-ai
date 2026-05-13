import { useEffect, useState, useRef } from 'react'
import { fetchBot, createBot, updateBot, checkSlug, fetchThemes } from '../lib/apiClient'
import type { Bot, ThemePreset } from '../types/api'

const BASE_URL = window.location.origin + '/c/'

export default function BotPage() {
  const [bot, setBot] = useState<Bot | null>(null)
  const [themes, setThemes] = useState<ThemePreset[]>([])
  const [form, setForm] = useState<Partial<Bot>>({})
  const [slugStatus, setSlugStatus] = useState<'ok' | 'taken' | null>(null)
  const [saving, setSaving] = useState(false)
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const slugTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    Promise.all([fetchBot().catch(() => null), fetchThemes()]).then(([b, t]) => {
      setThemes(t)
      if (b) { setBot(b); setForm(b) }
    })
  }, [])

  const handleSlugChange = (val: string) => {
    setForm(f => ({ ...f, public_slug: val }))
    setSlugStatus(null)
    if (slugTimer.current) clearTimeout(slugTimer.current)
    slugTimer.current = setTimeout(async () => {
      if (val.length < 3) return
      const res = await checkSlug(val).catch(() => null)
      if (res) setSlugStatus(res.available ? 'ok' : 'taken')
    }, 500)
  }

  const handleSave = async () => {
    setSaving(true); setAlert(null)
    try {
      if (!bot) {
        const created = await createBot({ name: form.name || 'マイボット', chat_title: form.chat_title || 'チャット', public_slug: form.public_slug! })
        setBot(created); setForm(created)
      } else {
        const updated = await updateBot(form)
        setBot(updated); setForm(updated)
      }
      setAlert({ type: 'success', msg: '保存しました。' })
    } catch {
      setAlert({ type: 'error', msg: '保存に失敗しました。' })
    } finally { setSaving(false) }
  }

  const togglePublic = async () => {
    if (!bot) return
    const updated = await updateBot({ is_public: !bot.is_public })
    setBot(updated); setForm(updated)
  }

  const publicUrl = `${BASE_URL}${form.public_slug || ''}`

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">ボット設定</h1>
        <p className="page-desc">チャットボットの基本情報を設定します。</p>
      </div>

      <div className="card">
        <div className="form-field">
          <label className="form-label">ボット名</label>
          <input className="form-input" style={{ maxWidth: 400 }}
            value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </div>

        <div className="form-field">
          <label className="form-label">チャットタイトル</label>
          <input className="form-input" style={{ maxWidth: 400 }}
            value={form.chat_title || ''} onChange={e => setForm(f => ({ ...f, chat_title: e.target.value }))} />
          <span className="form-hint">チャット画面上部に表示されるタイトルです。</span>
        </div>

        <div className="form-field">
          <label className="form-label">テーマ</label>
          <select className="form-select" style={{ maxWidth: 300 }}
            value={form.theme_preset_id || ''}
            onChange={e => setForm(f => ({ ...f, theme_preset_id: e.target.value || null }))}>
            <option value="">未選択</option>
            {themes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        <hr className="divider" />

        <div className="form-field">
          <label className="form-label">Slug</label>
          <input className="form-input" style={{ maxWidth: 360 }}
            value={form.public_slug || ''}
            onChange={e => handleSlugChange(e.target.value)}
            placeholder="my-company-faq" />
          {slugStatus === 'ok' && <span className="form-hint" style={{ color: '#15803d' }}>✓ 使用可能です</span>}
          {slugStatus === 'taken' && <span className="form-hint" style={{ color: '#dc2626' }}>✗ このURLはすでに使われています</span>}
          {!slugStatus && <span className="form-hint">英数字・ハイフンで入力してください。</span>}
        </div>

        <div className="form-field">
          <label className="form-label">公開URL</label>
          {form.public_slug ? (
            <div className="slug-preview">
              <span>🔗</span>
              <span>{publicUrl}</span>
              <button className="btn btn-secondary btn-sm" onClick={() => navigator.clipboard.writeText(publicUrl)}>コピー</button>
            </div>
          ) : (
            <span className="form-hint">Slug を入力すると公開URLが決まります。</span>
          )}
        </div>

        <div className="form-field" style={{ marginBottom: 0 }}>
          <label className="form-label">公開ステータス</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <label className="toggle">
              <input type="checkbox" checked={!!form.is_public} onChange={togglePublic} disabled={!bot} />
              <span className="toggle-track" />
            </label>
            <span style={{ fontSize: 13, color: form.is_public ? 'var(--green)' : 'var(--gray-500)', fontWeight: 500 }}>
              {form.is_public ? '公開中' : '非公開'}
            </span>
          </div>
        </div>
      </div>

      {alert && <div className={`alert alert-${alert.type}`} style={{ marginTop: 16 }}>{alert.msg}</div>}

      <div style={{ marginTop: 20 }}>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? '保存中...' : '💾 保存'}
        </button>
      </div>
    </div>
  )
}
