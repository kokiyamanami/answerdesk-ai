import { NavLink, Outlet } from 'react-router-dom'
import { logout } from '../lib/apiClient'
import { useAuth } from '../contexts/AuthContext'

const NAV_ITEMS = [
  { to: '/app/bot', label: 'ボット設定' },
  { to: '/app/design', label: 'デザイン設定' },
  { to: '/app/contact', label: '問い合わせ設定' },
  { to: '/app/faqs', label: 'FAQ' },
  { to: '/app/documents', label: '文書' },
  { to: '/app/test-chat', label: 'テストチャット' },
  { to: '/app/conversations', label: '会話ログ' },
]

const sidebarStyle: React.CSSProperties = {
  width: 200,
  minHeight: '100vh',
  background: '#1e293b',
  color: '#f1f5f9',
  display: 'flex',
  flexDirection: 'column',
  padding: '24px 0',
  flexShrink: 0,
}

const linkStyle: React.CSSProperties = {
  display: 'block',
  padding: '10px 24px',
  color: '#cbd5e1',
  textDecoration: 'none',
  fontSize: 14,
}

export default function AdminLayout() {
  const { user } = useAuth()

  const handleLogout = async () => {
    await logout()
    window.location.href = '/login'
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={sidebarStyle}>
        <div style={{ padding: '0 24px 24px', fontWeight: 700, fontSize: 16 }}>AnswerDesk AI</div>
        <nav style={{ flex: 1 }}>
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }) => ({
                ...linkStyle,
                background: isActive ? '#334155' : 'transparent',
                color: isActive ? '#f1f5f9' : '#cbd5e1',
              })}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div style={{ padding: '16px 24px', borderTop: '1px solid #334155' }}>
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>{user?.email}</div>
          <button
            onClick={handleLogout}
            style={{ fontSize: 12, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            ログアウト
          </button>
        </div>
      </aside>
      <main style={{ flex: 1, padding: 32, background: '#f8fafc', overflowY: 'auto' }}>
        <Outlet />
      </main>
    </div>
  )
}
