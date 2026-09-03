import { useEffect, useRef } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'

export default function RequireBot() {
  const { bots, loading } = useAuth()
  const { showToast } = useToast()
  const toastShown = useRef(false)

  useEffect(() => {
    if (!loading && bots.length === 0 && !toastShown.current) {
      toastShown.current = true
      showToast('ボットを先に作成してください。', 'warning')
    }
  }, [loading, bots.length, showToast])

  if (loading) return <div style={{ padding: 32 }}>読み込み中...</div>
  if (bots.length === 0) return <Navigate to="/app/bot" replace />
  return <Outlet />
}
