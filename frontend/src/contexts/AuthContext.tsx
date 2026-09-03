import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { User, Bot, BotSummary } from '../types/api'
import { fetchMe, fetchBot, fetchBotList } from '../lib/apiClient'
import { CURRENT_BOT_KEY } from '../lib/api'

interface AuthContextValue {
  user: User | null
  bot: Bot | null
  bots: BotSummary[]
  currentBotId: string | null
  loading: boolean
  refetch: () => void
  refetchBot: () => void
  refetchBots: () => Promise<void>
  setCurrentBot: (id: string) => void
  clearAuth: () => void
}

const noop = () => {}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  bot: null,
  bots: [],
  currentBotId: null,
  loading: true,
  refetch: noop,
  refetchBot: noop,
  refetchBots: async () => {},
  setCurrentBot: noop,
  clearAuth: noop,
})

function readStoredBotId(): string | null {
  try { return localStorage.getItem(CURRENT_BOT_KEY) } catch { return null }
}
function writeStoredBotId(id: string | null) {
  try {
    if (id) localStorage.setItem(CURRENT_BOT_KEY, id)
    else localStorage.removeItem(CURRENT_BOT_KEY)
  } catch { /* ignore */ }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [bot, setBot] = useState<Bot | null>(null)
  const [bots, setBots] = useState<BotSummary[]>([])
  const [currentBotId, setCurrentBotId] = useState<string | null>(readStoredBotId())
  const [loading, setLoading] = useState(true)

  const loadBot = () => {
    fetchBot().then(setBot).catch(() => setBot(null))
  }

  const resolveCurrent = (list: BotSummary[]): string | null => {
    const stored = readStoredBotId()
    if (stored && list.some(b => b.id === stored)) return stored
    return list[0]?.id ?? null
  }

  const refetchBots = async () => {
    const list = await fetchBotList().catch(() => [] as BotSummary[])
    setBots(list)
    const id = resolveCurrent(list)
    writeStoredBotId(id)
    setCurrentBotId(id)
    if (id) await fetchBot().then(setBot).catch(() => setBot(null))
    else setBot(null)
  }

  const load = () => {
    setLoading(true)
    fetchMe()
      .then(async u => {
        setUser(u)
        await refetchBots()
      })
      .catch(() => { setUser(null); setBot(null); setBots([]) })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setCurrentBot = (id: string) => {
    writeStoredBotId(id)
    setCurrentBotId(id)
    fetchBot().then(setBot).catch(() => setBot(null))
  }

  const clearAuth = () => {
    setUser(null); setBot(null); setBots([]); setCurrentBotId(null)
    writeStoredBotId(null)
  }

  return (
    <AuthContext.Provider value={{
      user, bot, bots, currentBotId, loading,
      refetch: load, refetchBot: loadBot, refetchBots, setCurrentBot, clearAuth,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
