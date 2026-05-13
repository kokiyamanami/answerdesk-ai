import { useEffect, useState, useRef } from 'react'
import { fetchBot, createBot, updateBot, checkSlug, fetchThemes } from '../lib/apiClient'
import type { Bot, ThemePreset } from '../types/api'

const BASE_URL = 'https://answerdesk.ai/c/'

export default function BotPage() {
  const [bot, setBot] = useState<Bot | null>(null)
  const [themes, setThemes] = useState<ThemePreset[]>([])
  const [form, setForm] = useState<Partial<Bot>>({})
  const [slugStatus, setSlugStatus] = useState<'ok' | 'taken' | 'invalid' | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const slugTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    Promise.all([
      fetchBot().catch(() => null),
      fetchThemes(),
    ]).then(([b, t]) => {
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
      if (!res) return
      setSlugStatus(res.available ? 'ok' : 'taken')
    }, 500)
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      if (!bot) {
        const created = await createBot({
          name: form.name || 'マイボット',
          chat_title: form.chat_title || 'チャット',
          public_slug: form.public_slug!,
        })
        setBot(created)
        setForm(created)
        setMessage('ボットを作成しました。')
      } else {
        const updated = await updateBot(form)
        setBot(updated)
        setForm(updated)
        setMessage('保存しました。')
      }
    } catch {
      setMessage('保存に失敗しました。')
    } finally {
      setSaving(false)
    }
  }

  const togglePublic = async () => {
    if (!bot) return
    const updated = await updateBot({ is_public: !bot.is_public })
    setBot(updated)
    setForm(updated)
  }

  const publicUrl = `${BASE_URL}${form.public_slug || ''}`

  return (
    <div style={{ maxWidth: 640 }}>
      <h1 style={{ fontSize: 22, marginBottom: 24 }}>ボット設定</h1>

      <Field label="ボット名">
        <input value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
      </Field>

      <Field label="チャットタイトル">
        <input value={form.chat_title || ''} onChange={e => setForm(f => ({ ...f, chat_title: e.target.value }))} />
      </Field>

      <Field label="公開URL (slug)">
        <input
          value={form.public_slug || ''}
          onChange={e => handleSlugChange(e.target.value)}
          placeholder="my-company-faq"
        />
        {slugStatus === 'taken' && <span style={{ color: 'red', fontSize: 12 }}>このURLはすでに使用されています。</span>}
        {slugStatus === 'ok' && <span style={{ color: 'green', fontSize: 12 }}>使用可能です。</span>}
        {form.public_slug && (
          <div style={{ marginTop: 4, fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{publicUrl}</span>
            <button onClick={() => navigator.clipboard.writeText(publicUrl)} style={smallBtn}>コピー</button>
          </div>
        )}
      </Field>

      <Field label="テーマ">
        <select
          value={form.theme_preset_id || ''}
          onChange={e => setForm(f => ({ ...f, theme_preset_id: e.target.value || null }))}
        >
          <option value="">未選択</option>
          {themes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </Field>

      <Field label="公開 / 非公開">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 14, color: bot?.is_public ? '#16a34a' : '#64748b' }}>
            {bot?.is_public ? '公開中' : '非公開'}
          </span>
          {bot && (
            <button onClick={togglePublic} style={smallBtn}>
              {bot.is_public ? '非公開にする' : '公開する'}
            </button>
          )}
        </div>
      </Field>

      {message && <p style={{ color: message.includes('失敗') ? 'red' : 'green', marginBottom: 12 }}>{message}</p>}

      <button onClick={handleSave} disabled={saving} style={primaryBtn}>
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
const smallBtn: React.CSSProperties = {
  padding: '4px 10px', fontSize: 12, border: '1px solid #e2e8f0',
  borderRadius: 4, cursor: 'pointer', background: '#fff',
}
