import { createContext, useContext, useState, useCallback } from 'react'
import type { ReactNode } from 'react'

type ToastType = 'success' | 'error' | 'warning'

interface Toast {
  id: number
  type: ToastType
  message: string
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} })

let _id = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, type: ToastType = 'error') => {
    const id = ++_id
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        zIndex: 9999,
        pointerEvents: 'none',
      }}>
        {toasts.map(t => (
          <div
            key={t.id}
            className={`alert alert-${t.type}`}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
              fontSize: 14,
              fontWeight: 500,
              whiteSpace: 'nowrap',
              animation: 'fadeInUp 0.2s ease',
            }}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
