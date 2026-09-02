import { useEffect, useState } from 'react'
import {
  fetchBotMembers, inviteBotMember, updateBotMemberRole, removeBotMember, cancelBotInvite, extractApiError,
} from '../lib/apiClient'
import type { BotMember } from '../types/api'

const ROLE_LABEL: Record<string, string> = { owner: 'オーナー', editor: '編集者' }

export default function MembersPage() {
  const [members, setMembers] = useState<BotMember[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'owner' | 'editor'>('editor')
  const [busy, setBusy] = useState(false)
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const iAmOwner = members.some(m => m.is_me && m.role === 'owner')

  const load = () => fetchBotMembers().then(setMembers).catch(() => {}).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const handleInvite = async () => {
    const e = email.trim()
    if (!e || busy) return
    setBusy(true); setAlert(null)
    try {
      const created = await inviteBotMember(e, role)
      setEmail('')
      await load()
      setAlert({
        type: 'success',
        msg: created.status === 'pending'
          ? `${e} を招待しました。相手がアカウント登録すると自動で参加します。`
          : `${e} を追加しました。`,
      })
    } catch (err) {
      setAlert({ type: 'error', msg: extractApiError(err, '追加に失敗しました。') })
    } finally { setBusy(false) }
  }

  const handleRole = async (m: BotMember, next: 'owner' | 'editor') => {
    if (!m.user_id) return
    setAlert(null)
    try {
      await updateBotMemberRole(m.user_id, next)
      await load()
    } catch (err) {
      setAlert({ type: 'error', msg: extractApiError(err, 'ロール変更に失敗しました。') })
    }
  }

  const handleRemove = async (m: BotMember) => {
    const isPending = m.status === 'pending'
    if (!confirm(isPending ? `${m.email} の招待を取り消しますか？` : `${m.email} をメンバーから外しますか？`)) return
    setAlert(null)
    try {
      if (isPending && m.invite_id) await cancelBotInvite(m.invite_id)
      else if (m.user_id) await removeBotMember(m.user_id)
      await load()
    } catch (err) {
      setAlert({ type: 'error', msg: extractApiError(err, '削除に失敗しました。') })
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">メンバー</h1>
        <p className="page-desc">
          このチャットボットを編集できるユーザーを管理します。オーナーはメンバー管理も行えます。
          招待するユーザーは先にアカウント登録が必要です。
        </p>
      </div>

      {alert && <div className={`alert alert-${alert.type}`} style={{ marginBottom: 16 }}>{alert.msg}</div>}

      {iAmOwner && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="form-field" style={{ marginBottom: 0, flex: '1 1 240px' }}>
              <label className="form-label">メールアドレス</label>
              <input className="form-input" type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleInvite() }}
                placeholder="member@yourcompany.com" />
            </div>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <label className="form-label">ロール</label>
              <select className="form-input" value={role} onChange={e => setRole(e.target.value as 'owner' | 'editor')}>
                <option value="editor">編集者</option>
                <option value="owner">オーナー</option>
              </select>
            </div>
            <button className="btn btn-primary" onClick={handleInvite} disabled={busy || !email.trim()}>
              ＋ 追加
            </button>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <p style={{ padding: 24, color: 'var(--gray-400)' }}>読み込み中...</p>
        ) : (
          <table className="data-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>ユーザー</th>
                <th style={{ width: 140 }}>ロール</th>
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {members.map(m => {
                const pending = m.status === 'pending'
                return (
                  <tr key={m.user_id ?? m.invite_id} style={pending ? { opacity: 0.7 } : undefined}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--gray-800)' }}>
                        {pending ? m.email : m.display_name}
                        {m.is_me && <span style={{ color: 'var(--gray-400)', fontWeight: 400 }}>（自分）</span>}
                        {pending && <span className="badge badge-gray" style={{ marginLeft: 8 }}>招待中（未登録）</span>}
                      </div>
                      {!pending && <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>{m.email}</div>}
                    </td>
                    <td>
                      {iAmOwner && !pending ? (
                        <select className="form-input" style={{ padding: '4px 8px', fontSize: 13 }}
                          value={m.role} onChange={e => handleRole(m, e.target.value as 'owner' | 'editor')}>
                          <option value="editor">編集者</option>
                          <option value="owner">オーナー</option>
                        </select>
                      ) : (
                        <span>{ROLE_LABEL[m.role] ?? m.role}</span>
                      )}
                    </td>
                    <td>
                      {iAmOwner && (
                        <button className="btn btn-danger btn-sm" onClick={() => handleRemove(m)}>
                          {pending ? '取消' : '削除'}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
