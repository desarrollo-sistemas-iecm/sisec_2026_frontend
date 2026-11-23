import axios from 'axios'
import { useAuthStore } from '../stores/authStore.js'

const resolveBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    if (isLocalhost) {
      if (window.location.port === '5173') {
        return '/api'
      }
      return 'http://localhost:3013/api'
    }
  }
  return import.meta.env.VITE_API_URL || '/api'
}

const api = axios.create({
  baseURL: resolveBaseUrl()
})

api.interceptors.request.use((config) => {
  const authStore = useAuthStore()
  if (authStore.token) {
    config.headers.Authorization = `Bearer ${authStore.token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const authStore = useAuthStore()
      authStore.logout()
      
      // Si no estamos ya en la página de login, redirigir
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api

