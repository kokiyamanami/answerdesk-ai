import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { User, Bot } from '../types/api'
import { fetchMe, fetchBot } from '../lib/apiClient'

interface AuthContextValue {
  user: User | null
  bot: Bot | null
  loading: boolean
  refetch: () => void
  refetchBot: () => void
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  bot: null,
  loading: true,
  refetch: () => {},
  refetchBot: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [bot, setBot] = useState<Bot | null>(null)
  const [loading, setLoading] = useState(true)

  const loadBot = () => {
    fetchBot()
      .then(setBot)
      .catch(() => setBot(null))
  }

  const load = () => {
    fetchMe()
      .then(u => {
        setUser(u)
        return fetchBot().then(setBot).catch(() => setBot(null))
      })
      .catch(() => { setUser(null); setBot(null) })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchMe()
      .then(u => {
        setUser(u)
        return fetchBot().then(setBot).catch(() => setBot(null))
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <AuthContext.Provider value={{ user, bot, loading, refetch: load, refetchBot: loadBot }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
