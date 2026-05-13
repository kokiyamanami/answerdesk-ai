import { NavLink, Outlet } from 'react-router-dom'
import { logout } from '../lib/apiClient'
import { useAuth } from '../contexts/AuthContext'
import '../admin.css'

const NAV_ITEMS = [
  { to: '/app/bot',           icon: '🤖', label: 'ボット設定' },
  { to: '/app/design',        icon: '🎨', label: 'デザイン' },
  { to: '/app/contact',       icon: '📬', label: '問い合わせ設定' },
  { to: '/app/faqs',          icon: '💬', label: 'FAQ' },
  { to: '/app/documents',     icon: '📄', label: 'ドキュメント' },
  { to: '/app/test-chat',     icon: '🧪', label: 'テストチャット' },
  { to: '/app/conversations', icon: '🗂️', label: '会話ログ' },
]

export default function AdminLayout() {
  const { user } = useAuth()

  const handleLogout = async () => {
    await logout()
    window.location.href = '/login'
  }

  const initials = user?.email?.slice(0, 1).toUpperCase() ?? 'A'

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">✦</div>
          <span className="sidebar-logo-text">AnswerDesk AI</span>
        </div>

        <div className="sidebar-section-label">メニュー</div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{initials}</div>
            <span className="sidebar-email">{user?.email}</span>
          </div>
          <button className="sidebar-logout" onClick={handleLogout}>
            ログアウト
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  )
}
