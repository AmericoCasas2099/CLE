import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '@/services/api'
import { Loader2, BookOpen } from 'lucide-react'

export function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!email.trim() || !password.trim()) {
      setError('Ingresa tu correo y contraseña.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await api.post('/api/v1/auth/login', {
        correo: email.trim(),
        password: password.trim(),
      })

      // 1. Extracción segura del token
      const authToken = response.data.token || response.data.access_token
      if (authToken) {
        localStorage.setItem('cle_token', authToken)
      }

      // 2. Extracción de usuario (en español como lo manda el backend)
      const rawUser = response.data.usuario || response.data.user || {}

      // 3. Obtener rol_id y nombre del rol desde el objeto anidado rol: { rol_id, nombre }
      const roleId = Number(rawUser.rol?.rol_id ?? rawUser.rol_id ?? 1)
      const roleName = rawUser.rol?.nombre || rawUser.rol || 'Administrador'

      // 4. Guardar datos de usuario estructurados para el AppShell y Sidebar
      const sessionUser = {
        usuario_id: rawUser.usuario_id,
        correo: rawUser.correo,
        rol_id: roleId,
        rol: roleName,
        role: roleName,
        nombre: rawUser.correo ? rawUser.correo.split('@')[0] : 'Usuario CLE',
      }
      localStorage.setItem('cle_user', JSON.stringify(sessionUser))

      // 5. Redirección según rol_id (1: Admin, 2: Maestro, 3: Alumno)
      if (roleId === 2 || roleName === 'Maestro') {
        navigate('/maestros/grupos', { replace: true })
      } else if (roleId === 3 || roleName === 'Alumno') {
        navigate('/alumnos/mitablero', { replace: true })
      } else {
        navigate('/admin/dashboard', { replace: true })
      }
    } catch (err) {
      if (!err.response) {
        setError('No se pudo establecer conexión con el servidor (verifique el túnel o su conexión a internet).')
      } else {
        const mensaje =
          err.response.data?.mensaje ||
          err.response.data?.error?.mensaje ||
          err.response.data?.error ||
          'Credenciales inválidas.'
        setError(typeof mensaje === 'string' ? mensaje : 'Error al verificar credenciales.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-zinc-50 px-4 py-10">
      <div className="w-full max-w-sm">
        {/* Encabezado institucional */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex size-11 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
            <BookOpen className="size-5" aria-hidden="true" />
          </div>
          <h1 className="mt-4 text-xl font-semibold tracking-tight text-zinc-900">
            CLE - Plataforma de Idiomas
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Centro de Lenguas Extranjeras · Acceso institucional
          </p>
        </div>

        {/* Formulario */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-5 rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm"
          noValidate
        >
          <div className="flex flex-col gap-1.5 text-left">
            <label htmlFor="email" className="text-xs font-medium text-zinc-700">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="usuario@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5 text-left">
            <label htmlFor="password" className="text-xs font-medium text-zinc-700">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              required
            />
            {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:pointer-events-none disabled:opacity-50"
          >
            {loading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {loading ? 'Verificando…' : 'Iniciar Sesión'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-zinc-400">Periodo escolar activo 2026-B</p>
      </div>
    </main>
  )
}

export default Login