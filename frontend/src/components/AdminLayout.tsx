import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { logout } from '../lib/apiClient'
import { useAuth } from '../contexts/AuthContext'
import '../admin.css'

const NAV_ITEMS = [
  { to: '/app/bot',              icon: '🤖', label: 'ボット設定' },
  { to: '/app/design',           icon: '🎨', label: 'デザイン' },
  { to: '/app/contact',          icon: '📬', label: '問い合わせ' },
  { to: '/app/faqs',             icon: '💬', label: 'FAQ' },
  { to: '/app/documents',        icon: '📄', label: 'ドキュメント' },
  { to: '/app/conversations',    icon: '🗂️', label: '会話ログ' },
  { to: '/app/form-submissions', icon: '📩', label: 'フォーム送信' },
]

export default function AdminLayout() {
  const { user, clearAuth } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    clearAuth()
    window.location.href = '/login'
  }

  const initials = user?.email?.slice(0, 1).toUpperCase() ?? 'A'

  return (
    <div className="admin-layout">
      {/* ---- Mobile header ---- */}
      <header className="mobile-header">
        <button className="hamburger" onClick={() => setMenuOpen(o => !o)} aria-label="メニュー">
          <span className={`hamburger-line${menuOpen ? ' open' : ''}`} />
          <span className={`hamburger-line${menuOpen ? ' open' : ''}`} />
          <span className={`hamburger-line${menuOpen ? ' open' : ''}`} />
        </button>
        <span className="mobile-header-title">AnswerDesk AI</span>
      </header>

      {/* ---- Overlay (mobile) ---- */}
      {menuOpen && <div className="sidebar-overlay" onClick={() => setMenuOpen(false)} />}

      {/* ---- Sidebar ---- */}
      <aside className={`admin-sidebar${menuOpen ? ' sidebar-open' : ''}`}>
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
              onClick={() => setMenuOpen(false)}
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

      {/* ---- Bottom nav (mobile) ---- */}
      <nav className="bottom-nav">
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}
          >
            <span className="bottom-nav-icon">{item.icon}</span>
            <span className="bottom-nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  )
}
