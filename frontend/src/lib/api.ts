import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // HttpOnly Cookie を送信するために必要
})

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      // 認証切れはログイン画面へ
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
