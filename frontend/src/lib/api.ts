import axios from 'axios'

export const CURRENT_BOT_KEY = 'currentBotId'

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_BASE_URL ?? ''}/api`,
  withCredentials: true, // HttpOnly Cookie を送信するために必要
})

// 選択中のボットを X-Bot-Id ヘッダで送る（複数ボット編集用）
api.interceptors.request.use((config) => {
  try {
    const id = localStorage.getItem(CURRENT_BOT_KEY)
    if (id) config.headers['X-Bot-Id'] = id
  } catch {
    // localStorage 不可の環境では未指定（サーバーが所属ボットを1つ選ぶ）
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      // /login 以外のページにいる場合のみリダイレクト（/auth/me の401はAuthContextで処理するため除外）
      const isAuthMe = error.config?.url?.includes('/auth/me')
      const isAuthPage = ['/login', '/register'].includes(window.location.pathname)
      if (!isAuthMe && !isAuthPage) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
