import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // HttpOnly Cookie を送信するために必要
})

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      // /login 以外のページにいる場合のみリダイレクト（/auth/me の401はAuthContextで処理するため除外）
      const isAuthMe = error.config?.url?.includes('/auth/me')
      const isLoginPage = window.location.pathname === '/login'
      if (!isAuthMe && !isLoginPage) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
