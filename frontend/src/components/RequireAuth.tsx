import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function RequireAuth() {
  const { user, loading } = useAuth()
  if (loading) return <div style={{ padding: 32 }}>読み込み中...</div>
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}
