import { useEffect, useState, useRef } from 'react'
import { fetchBot, createBot, updateBot, checkSlug } from '../lib/apiClient'
import type { Bot } from '../types/api'

const BASE_URL = window.location.origin + '/c/'

export default function BotPage() {
  const [bot, setBot] = useState<Bot | null>(null)
  const [form, setForm] = useState<Partial<Bot>>({})
  const [slugStatus, setSlugStatus] = useState<'ok' | 'taken' | null>(null)
  const [saving, setSaving] = useState(false)
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const slugTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetchBot().catch(() => null).then(b => {
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

      {/* AI感度設定 */}
      <div className="card" style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, color: 'var(--gray-800)' }}>AI 応答感度</h2>
        <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 20 }}>
          質問とナレッジの一致度がこの値を下回った場合、AIは「回答できない」と判断してフォールバックします。
        </p>
        <div className="form-field" style={{ marginBottom: 0 }}>
          <label className="form-label">
            ヒット強度
            <span style={{
              marginLeft: 10, fontSize: 15, fontWeight: 700,
              color: 'var(--brand)',
            }}>
              {((form.rag_score_threshold ?? 0.5) * 100).toFixed(0)}%
            </span>
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--gray-400)', whiteSpace: 'nowrap' }}>広く拾う</span>
            <input
              type="range"
              min={0.1}
              max={0.95}
              step={0.05}
              value={form.rag_score_threshold ?? 0.5}
              onChange={e => setForm(f => ({ ...f, rag_score_threshold: parseFloat(e.target.value) }))}
              style={{ flex: 1 }}
            />
            <span style={{ fontSize: 12, color: 'var(--gray-400)', whiteSpace: 'nowrap' }}>厳密に一致</span>
          </div>
          <span className="form-hint" style={{ marginTop: 8 }}>
            {(form.rag_score_threshold ?? 0.5) < 0.35
              ? '⚠️ 低すぎると無関係な情報でも回答してしまう可能性があります。'
              : (form.rag_score_threshold ?? 0.5) > 0.75
              ? '⚠️ 高すぎると質問が少しずれただけでフォールバックしやすくなります。'
              : '✅ 推奨範囲内です。（目安: 35〜75%）'}
          </span>
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
