import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function RequireBot() {
  const { bot, loading } = useAuth()
  if (loading) return <div style={{ padding: 32 }}>読み込み中...</div>
  if (!bot) return <Navigate to="/app/bot" replace />
  return <Outlet />
}
