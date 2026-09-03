import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const ORIGIN = window.location.origin

export default function BotsHomePage() {
  const { bots, user, loading, setCurrentBot } = useAuth()
  const navigate = useNavigate()

  if (loading) return <div style={{ padding: 32 }}>読み込み中...</div>
  if (bots.length === 0) return <Navigate to="/app/bot?new=1" replace />

  const open = (id: string) => {
    setCurrentBot(id)
    navigate('/app/bot')
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">ボット一覧</h1>
        <p className="page-desc">
          {user?.email} が編集できるチャットボットです。カードを選ぶとそのボットの設定画面に移動します。
        </p>
      </div>

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
          onClick={() => navigate('/app/bot?new=1')}
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
  )
}
