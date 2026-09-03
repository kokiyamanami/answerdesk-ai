import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { logout } from '../lib/apiClient'
import { useAuth } from '../contexts/AuthContext'
import '../admin.css'

const NAV_ITEMS = [
  { to: '/app/bot',             icon: '🤖', label: 'ボット設定' },
  { to: '/app/design',          icon: '🎨', label: 'デザイン' },
  { to: '/app/contact',         icon: '📬', label: '問い合わせ' },
  { to: '/app/faqs',            icon: '💬', label: 'FAQ' },
  { to: '/app/documents',       icon: '📄', label: 'ドキュメント' },
  { to: '/app/accuracy',        icon: '🧪', label: '精度テスト' },
  { to: '/app/conversations',   icon: '🗂️', label: '会話ログ' },
  { to: '/app/form-submissions', icon: '📩', label: 'フォーム送信' },
  { to: '/app/members',         icon: '👥', label: 'メンバー' },
]

export default function AdminLayout() {
  const { user, bots, currentBotId, setCurrentBot, clearAuth } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [botMenuOpen, setBotMenuOpen] = useState(false)
  const navigate = useNavigate()

  const currentBot = bots.find(b => b.id === currentBotId) ?? null

  const handleLogout = async () => {
    await logout()
    clearAuth()
    window.location.href = '/login'
  }

  const pickBot = (id: string) => {
    setBotMenuOpen(false)
    setCurrentBot(id)
    navigate('/app/bot')
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
        <span className="mobile-header-title">
          {currentBot ? currentBot.chat_title : 'AnswerDesk AI'}
        </span>
      </header>

      {menuOpen && <div className="sidebar-overlay" onClick={() => setMenuOpen(false)} />}

      {/* ---- Sidebar ---- */}
      <aside className={`admin-sidebar${menuOpen ? ' sidebar-open' : ''}`}>
        <button
          className="sidebar-logo sidebar-logo-link"
          onClick={() => { setMenuOpen(false); navigate('/app') }}
          title="ボット一覧へ"
        >
          <div className="sidebar-logo-icon">✦</div>
          <span className="sidebar-logo-text">AnswerDesk AI</span>
        </button>

        {bots.length > 0 && (
          <div className="bot-switcher">
            <div className="sidebar-section-label">編集中のボット</div>
            <button className="bot-switcher-current" onClick={() => setBotMenuOpen(o => !o)}>
              <span className="bot-switcher-icon">💬</span>
              <span className="bot-switcher-name">{currentBot?.chat_title ?? 'ボットを選択'}</span>
              <span className="bot-switcher-caret">{botMenuOpen ? '▲' : '▼'}</span>
            </button>
            {botMenuOpen && (
              <>
                <div
                  onClick={() => setBotMenuOpen(false)}
                  style={{ position: 'fixed', inset: 0, zIndex: 25 }}
                />
                <div className="bot-switcher-menu">
                  {bots.map(b => (
                    <button
                      key={b.id}
                      className={`bot-switcher-item${b.id === currentBotId ? ' active' : ''}`}
                      onClick={() => pickBot(b.id)}
                    >
                      <span className="bot-switcher-name">{b.chat_title}</span>
                      <span className="bot-switcher-role">{b.role === 'owner' ? 'オーナー' : '編集者'}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

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
