import axios from 'axios'

const api = axios.create({
  baseURL: '', // Al estar vacío, toma http://localhost:5173 y el proxy de Vite lo redirige
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cle_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default api