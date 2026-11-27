import axios from 'axios'
import { useAuthStore } from '../stores/authStore.js'

const resolveBaseUrl = () => {
  const envApi = import.meta.env.VITE_API_URL
  if (envApi && envApi.trim() !== '') {
    return envApi
  }
  if (typeof window !== 'undefined') {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    if (isLocalhost) {
      if (window.location.port === '5173') {
        return '/api'
      }
      return 'http://localhost:3013/api'
    }
  }
  return '/api'
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
    const isUnauthorized = error.response && error.response.status === 401
    const isCierreSistema = error.response && error.response.status === 403 && (error.response.data?.cierre_sistema || error.response.data?.code === 'CIERRE_SISTEMA')

    if (isUnauthorized || isCierreSistema) {
      const authStore = useAuthStore()
      authStore.logout()
      
      // Si no estamos ya en la página de login, redirigir respetando la ruta base
      if (!window.location.pathname.includes('/login')) {
        const loginUrl = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '') + '/login'
        window.location.href = loginUrl
      }
    }
    return Promise.reject(error)
  }
)

export default api

