import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchBot, updateBot, deleteBot, checkSlug, extractApiError } from '../lib/apiClient'
import type { Bot } from '../types/api'
import { INDUSTRIES } from '../data/faqTemplates'
import { useAuth } from '../contexts/AuthContext'

const BASE_URL = window.location.origin + '/c/'

export default function BotPage() {
  const { bots, currentBotId, refetchBots } = useAuth()
  const navigate = useNavigate()
  const [bot, setBot] = useState<Bot | null>(null)
  const [form, setForm] = useState<Partial<Bot>>({})
  const [slugStatus, setSlugStatus] = useState<'ok' | 'taken' | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string; link?: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const slugTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isOwner = bots.find(b => b.id === currentBotId)?.role === 'owner'

  useEffect(() => {
    fetchBot().catch(() => null).then(b => {
      if (b) { setBot(b); setForm(b) }
      else navigate('/app', { replace: true })
    })
  }, [currentBotId, navigate])

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
    if (slugStatus === 'taken') {
      setAlert({ type: 'error', msg: 'このURLはすでに使用されています。' })
      return
    }
    setSaving(true); setAlert(null)
    try {
      const updated = await updateBot(form)
      setBot(updated); setForm(updated)
      await refetchBots()
      setAlert({ type: 'success', msg: '保存しました。', link: `${BASE_URL}${updated.public_slug}` })
    } catch (err) {
      setAlert({ type: 'error', msg: extractApiError(err, '保存に失敗しました。') })
    } finally { setSaving(false) }
  }

  const togglePublic = async () => {
    if (!bot) return
    const updated = await updateBot({ is_public: !bot.is_public })
    setBot(updated); setForm(updated)
    await refetchBots()
  }

  const handleDelete = async () => {
    if (!bot) return
    if (!confirm(`「${bot.chat_title}」を削除します。FAQ・ドキュメント・会話ログもすべて消えます。元に戻せません。`)) return
    setDeleting(true)
    try {
      await deleteBot()
      await refetchBots()
      navigate('/app', { replace: true })
    } catch (err) {
      setAlert({ type: 'error', msg: extractApiError(err, '削除に失敗しました。') })
      setDeleting(false)
    }
  }

  const publicUrl = `${BASE_URL}${form.public_slug || ''}`

  return (
    <>
      <div>
      <div className="page-header">
        <h1 className="page-title">ボット設定</h1>
        <p className="page-desc">チャットボットの基本情報を設定します。</p>
      </div>

      <div className="card">
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
            <>
              <div className="slug-preview">
                <span>🔗</span>
                <span>{publicUrl}</span>
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => {
                    navigator.clipboard.writeText(publicUrl)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  }}>コピー</button>
                  {copied && (
                    <div style={{
                      position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%',
                      transform: 'translateX(-50%)',
                      background: '#1e293b', color: '#fff',
                      fontSize: 12, padding: '4px 10px', borderRadius: 6,
                      whiteSpace: 'nowrap', pointerEvents: 'none',
                    }}>
                      コピーしました
                    </div>
                  )}
                </div>
                <a href={publicUrl} target="_blank" rel="noopener noreferrer"
                  className="btn btn-secondary btn-sm">
                  開く ↗
                </a>
              </div>
              <span className="form-hint">このURLにアクセスするとチャットボットを確認できます。</span>
            </>
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

      {/* 業界設定 */}
      <div className="card" style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, color: 'var(--gray-800)' }}>業界</h2>
        <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 16 }}>
          業界を選択するとFAQ管理画面でテンプレートを利用できます。
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {INDUSTRIES.map(ind => {
            const selected = form.industry === ind.value
            return (
              <div
                key={ind.value}
                onClick={() => setForm(f => ({ ...f, industry: selected ? null : ind.value }))}
                style={{
                  border: selected ? '2px solid var(--brand)' : '2px solid var(--gray-200)',
                  borderRadius: 10, padding: '8px 14px',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                  background: selected ? '#eef2ff' : '#fff',
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: 16 }}>{ind.icon}</span>
                <span style={{ fontSize: 13, fontWeight: selected ? 700 : 400, color: selected ? 'var(--brand)' : 'var(--gray-700)' }}>
                  {ind.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* AIモデル設定 */}
      <div className="card" style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, color: 'var(--gray-800)' }}>AI モデル</h2>
        <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 16 }}>
          回答生成に使用するOpenAIモデルを選択します。
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            { value: 'gpt-4.1-mini', label: 'GPT-4.1 mini', cost: '低', accuracy: '標準〜良', tag: '推奨',
              desc: 'FAQボットはナレッジを渡して回答するため、通常はこれで十分。' },
            { value: 'gpt-4.1',      label: 'GPT-4.1',      cost: '高（4.1 mini の約5倍）', accuracy: '高',
              desc: '言い回しが難しい質問や、要約・整形が多い場合に。' },
            { value: 'gpt-4o-mini',  label: 'GPT-4o mini',  cost: '最安（4.1 mini の約半分）', accuracy: '標準',
              desc: 'コストを最優先したい場合。' },
            { value: 'gpt-4o',       label: 'GPT-4o',       cost: '最高', accuracy: '高',
              desc: '4.1 が出た現在、あえて選ぶ理由は小さい。' },
          ].map(m => {
            const selected = (form.ai_model || 'gpt-4.1-mini') === m.value
            return (
              <div
                key={m.value}
                onClick={() => setForm(f => ({ ...f, ai_model: m.value }))}
                style={{
                  border: selected ? '2px solid var(--brand)' : '2px solid var(--gray-200)',
                  borderRadius: 10, padding: '12px 16px', width: 210,
                  background: selected ? '#eef2ff' : '#fff',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-800)' }}>{m.label}</span>
                  {m.tag && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: 'var(--brand)',
                      background: '#eef2ff', borderRadius: 4, padding: '1px 5px',
                    }}>{m.tag}</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: 'var(--gray-600)', marginBottom: 4 }}>
                  コスト: {m.cost}<br />精度: {m.accuracy}
                </div>
                <div style={{ fontSize: 11, color: 'var(--gray-500)', lineHeight: 1.5 }}>{m.desc}</div>
              </div>
            )
          })}
        </div>
        <p style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 12, lineHeight: 1.6 }}>
          💡 このボットは登録済みのFAQ・ドキュメントを根拠に回答するため、モデルによる差は出にくいです。
          まずは GPT-4.1 mini で運用し、回答の質に不満があれば GPT-4.1 に上げてください。
          コストの倍率は目安です（正確な単価は OpenAI の料金ページを参照）。
        </p>
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

      {alert && (
        <div className={`alert alert-${alert.type}`} style={{ marginTop: 16 }}>
          {alert.msg}
          {alert.link && (
            <a href={alert.link} target="_blank" rel="noopener noreferrer"
              style={{ marginLeft: 12, fontWeight: 600, textDecoration: 'underline', color: 'inherit' }}>
              ボットを確認する ↗
            </a>
          )}
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? '保存中...' : '💾 保存'}
        </button>
      </div>

      {isOwner && bot && (
        <div className="card" style={{ marginTop: 32, borderColor: 'var(--red)' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, color: 'var(--red)' }}>危険な操作</h2>
          <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 14 }}>
            このボットを削除すると、FAQ・ドキュメント・会話ログ・メンバー設定もすべて削除されます。元に戻せません。
          </p>
          <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? '削除中...' : 'このボットを削除'}
          </button>
        </div>
      )}
    </div>
    </>
  )
}
