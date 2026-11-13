import axios from 'axios'

const api = axios.create({
  baseURL: '', // Al estar vacío, toma http://localhost:5173 y el proxy de Vite lo redirige
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('cle_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)
// Interceptor de respuestas para capturar sesiones caducadas
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !skipRedirect) {
      localStorage.removeItem('cle_token')
      localStorage.removeItem('cle_user')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api