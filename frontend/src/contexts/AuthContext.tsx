import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { User } from '../types/api'
import { fetchMe } from '../lib/apiClient'

interface AuthContextValue {
  user: User | null
  loading: boolean
  refetch: () => void
}

const AuthContext = createContext<AuthContextValue>({ user: null, loading: true, refetch: () => {} })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    fetchMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  return <AuthContext.Provider value={{ user, loading, refetch: load }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
