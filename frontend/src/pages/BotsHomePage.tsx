import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { logout, createBot, checkSlug, extractApiError } from '../lib/apiClient'
import { useAuth } from '../contexts/AuthContext'
import '../admin.css'

const ORIGIN = window.location.origin

function NewBotModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [chatTitle, setChatTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [slugStatus, setSlugStatus] = useState<'ok' | 'taken' | null>(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const onSlugChange = (v: string) => {
    setSlug(v)
    setSlugStatus(null)
    if (timer.current) clearTimeout(timer.current)
    if (v.length < 3) return
    timer.current = setTimeout(async () => {
      const res = await checkSlug(v).catch(() => null)
      if (res) setSlugStatus(res.available ? 'ok' : 'taken')
    }, 400)
  }

  const canSubmit = chatTitle.trim() && slug.trim().length >= 3 && slugStatus !== 'taken' && !saving

  const submit = async () => {
    if (!canSubmit) return
    setSaving(true); setErr(null)
    try {
      const bot = await createBot({ chat_title: chatTitle.trim(), public_slug: slug.trim() })
      onCreated(bot.id)
    } catch (e) {
      setErr(extractApiError(e, '作成に失敗しました。'))
      setSaving(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)', zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 14, padding: 24, width: 420, maxWidth: '100%' }}
      >
        <h2 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 4px', color: 'var(--gray-900)' }}>新しいボット</h2>
        <p style={{ fontSize: 13, color: 'var(--gray-500)', margin: '0 0 18px' }}>
          名前と公開URLのスラグを決めます。あとから変更できます。
        </p>

        {err && <div className="alert alert-error" style={{ marginBottom: 12 }}>{err}</div>}

        <div className="form-field">
          <label className="form-label">チャットタイトル</label>
          <input className="form-input" value={chatTitle}
            onChange={e => setChatTitle(e.target.value)} placeholder="例: 受講生サポート" autoFocus />
        </div>

        <div className="form-field" style={{ marginBottom: 4 }}>
          <label className="form-label">Slug（公開URL）</label>
          <input className="form-input" value={slug}
            onChange={e => onSlugChange(e.target.value)} placeholder="my-company-faq" />
          {slugStatus === 'ok' && <span className="form-hint" style={{ color: '#15803d' }}>✓ 使用可能です</span>}
          {slugStatus === 'taken' && <span className="form-hint" style={{ color: '#dc2626' }}>✗ このURLはすでに使われています</span>}
          {!slugStatus && slug && <span className="form-hint">{ORIGIN}/c/{slug}</span>}
          {!slug && <span className="form-hint">英数字・ハイフン、3文字以上</span>}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <button className="btn btn-secondary" onClick={onClose}>キャンセル</button>
          <button className="btn btn-primary" onClick={submit} disabled={!canSubmit}>
            {saving ? '作成中…' : '作成する'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function BotsHomePage() {
  const { bots, user, loading, setCurrentBot, refetchBots } = useAuth()
  const navigate = useNavigate()
  const [showNew, setShowNew] = useState(false)

  if (loading) return <div style={{ padding: 32 }}>読み込み中...</div>

  const open = (id: string) => {
    setCurrentBot(id)
    navigate('/app/bot')
  }

  const handleLogout = async () => {
    await logout()
    window.location.href = '/login'
  }

  const onCreated = async (id: string) => {
    await refetchBots()
    setShowNew(false)
    open(id)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)' }}>
      <header style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 24px', background: '#fff', borderBottom: '1px solid var(--gray-200)',
      }}>
        <div className="sidebar-logo-icon">✦</div>
        <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--gray-900)' }}>AnswerDesk AI</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 13, color: 'var(--gray-500)' }}>{user?.email}</span>
          <button onClick={handleLogout}
            style={{ background: 'transparent', border: 'none', color: 'var(--gray-500)', fontSize: 13, cursor: 'pointer' }}>
            ログアウト
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px' }}>
        <h1 className="page-title" style={{ marginBottom: 4 }}>ボット一覧</h1>
        <p className="page-desc" style={{ marginBottom: 24 }}>
          {bots.length > 0 ? '編集したいチャットボットを選んでください。' : 'まずはボットを作成しましょう。'}
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 16,
        }}>
          {bots.map(b => (
            <button
              key={b.id}
              onClick={() => open(b.id)}
              style={{
                textAlign: 'left', cursor: 'pointer',
                border: '1px solid var(--gray-200)', borderRadius: 12,
                background: '#fff', padding: 18,
                display: 'flex', flexDirection: 'column', gap: 10,
                transition: 'box-shadow .15s, border-color .15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,.08)'; e.currentTarget.style.borderColor = 'var(--brand)' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'var(--gray-200)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                  background: 'var(--brand-light, #eef2ff)', color: 'var(--brand)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                }}>💬</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: 'var(--gray-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {b.chat_title}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--gray-400)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ORIGIN}/c/{b.public_slug}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span className={`badge ${b.role === 'owner' ? 'badge-indigo' : 'badge-gray'}`}>
                  {b.role === 'owner' ? 'オーナー' : '編集者'}
                </span>
                <span className={`badge ${b.is_public ? 'badge-green' : 'badge-gray'}`}>
                  {b.is_public ? '公開中' : '非公開'}
                </span>
              </div>
            </button>
          ))}

          <button
            onClick={() => setShowNew(true)}
            style={{
              cursor: 'pointer', border: '2px dashed var(--gray-200)', borderRadius: 12,
              background: 'transparent', padding: 18, minHeight: 120,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 8, color: 'var(--gray-500)', fontWeight: 600,
            }}
          >
            <span style={{ fontSize: 24 }}>＋</span>
            新しいボットを作成
          </button>
        </div>
      </div>

      {showNew && <NewBotModal onClose={() => setShowNew(false)} onCreated={onCreated} />}
    </div>
  )
}
