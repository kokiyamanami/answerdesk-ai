import { useState } from 'react'
import { Link, useNavigate, Navigate } from 'react-router-dom'
import api from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import '../admin.css'

export default function LoginPage() {
  const navigate = useNavigate()
  const { user, loading: authLoading, refetch } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!authLoading && user) return <Navigate to="/app" replace />

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await api.post('/auth/login', { email, password })
      refetch()
      navigate('/app')
    } catch {
      setError('メールアドレスまたはパスワードが正しくありません。')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--gray-50)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 16px',
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 44, height: 44,
            background: 'var(--brand)',
            borderRadius: 12,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            marginBottom: 14,
            boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
          }}>✦</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--gray-900)', margin: 0, letterSpacing: '-0.3px' }}>
            AnswerDesk AI
          </h1>
          <p style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 6 }}>管理画面にログイン</p>
        </div>

        {/* Card */}
        <div className="card">
          <form onSubmit={handleSubmit}>
            <div className="form-field">
              <label className="form-label">メールアドレス</label>
              <input
                className="form-input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <label className="form-label">パスワード</label>
              <input
                className="form-input"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="パスワードを入力"
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="alert alert-error" style={{ marginTop: 16 }}>{error}</div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{ width: '100%', marginTop: 24, justifyContent: 'center' }}
            >
              {submitting ? 'ログイン中...' : 'ログイン'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--gray-500)' }}>
          アカウントをお持ちでない方は{' '}
          <Link to="/register" style={{ color: 'var(--brand)', fontWeight: 600, textDecoration: 'none' }}>
            新規登録
          </Link>
        </p>
      </div>
    </div>
  )
}

