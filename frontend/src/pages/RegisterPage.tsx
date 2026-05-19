import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import '../admin.css'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { refetch } = useAuth()
  const [form, setForm] = useState({ email: '', password: '', confirm: '' })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    if (form.password !== form.confirm) {
      setError('パスワードが一致しません。')
      return
    }
    if (form.password.length < 8) {
      setError('パスワードは8文字以上で入力してください。')
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/register', {
        email: form.email,
        password: form.password,
      })
      refetch()
      navigate('/app/bot')
    } catch (err) {
      const msg = (err as { response?: { data?: { detail?: { message?: string } } } })?.response?.data?.detail?.message
      setError(msg || '登録に失敗しました。')
    } finally {
      setLoading(false)
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
      <div style={{ width: '100%', maxWidth: 420 }}>
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
          <p style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 6 }}>新規アカウント登録</p>
        </div>

        {/* Card */}
        <div className="card">
          <form onSubmit={handleSubmit}>
            <div className="form-field">
              <label className="form-label">メールアドレス</label>
              <input
                className="form-input"
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="form-field">
              <label className="form-label">パスワード</label>
              <input
                className="form-input"
                type="password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="8文字以上で入力"
                required
                autoComplete="new-password"
              />
              <span className="form-hint">8文字以上で入力してください。</span>
            </div>

            <div className="form-field" style={{ marginBottom: 0 }}>
              <label className="form-label">パスワード（確認）</label>
              <input
                className="form-input"
                type="password"
                value={form.confirm}
                onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                placeholder="もう一度入力"
                required
                autoComplete="new-password"
              />
            </div>

            {error && (
              <div className="alert alert-error" style={{ marginTop: 16 }}>{error}</div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', marginTop: 24, justifyContent: 'center' }}
            >
              {loading ? '登録中...' : 'アカウントを作成'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--gray-500)' }}>
          すでにアカウントをお持ちの方は{' '}
          <Link to="/login" style={{ color: 'var(--brand)', fontWeight: 600, textDecoration: 'none' }}>
            ログイン
          </Link>
        </p>
      </div>
    </div>
  )
}
