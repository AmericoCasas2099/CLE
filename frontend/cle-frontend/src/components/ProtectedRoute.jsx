import { Navigate, Outlet, useNavigate } from 'react-router-dom'
import { ShieldAlert, ArrowLeft } from 'lucide-react'

export function ProtectedRoute({ allowedRoles }) {
  const navigate = useNavigate()
  const token = localStorage.getItem('cle_token')
  const rawUser = localStorage.getItem('cle_user')

  // 1. Sin token: redirige inmediatamente a Login
  if (!token || !rawUser) {
    return <Navigate to="/login" replace />
  }

  let user = {}
  try {
    user = JSON.parse(rawUser)
  } catch {
    localStorage.removeItem('cle_token')
    localStorage.removeItem('cle_user')
    return <Navigate to="/login" replace />
  }

  const roleId = Number(user.rol_id ?? user.rol?.rol_id)
  const roleLabel =
    user.rol?.nombre ||
    user.role ||
    (roleId === 1 ? 'Administrador' : roleId === 2 ? 'Maestro' : 'Alumno')

  // 2. Con sesión activa, pero rol no autorizado para esta ruta
  if (allowedRoles && !allowedRoles.includes(roleId)) {
    const homePath =
      roleId === 2
        ? '/maestros/grupos'
        : roleId === 3
        ? '/alumnos/mitablero'
        : '/admin/dashboard'

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6 text-center">
        <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
            <ShieldAlert className="size-6" />
          </div>
          <p className="mt-4 font-mono text-xs font-semibold uppercase tracking-wider text-rose-600">
            Error 403 · Acceso Denegado
          </p>
          <h1 className="mt-1 text-xl font-bold text-zinc-900">
            Operación no autorizada
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Tu cuenta (<span className="font-medium text-zinc-800">{user.correo}</span>) tiene el rol{' '}
            <span className="font-semibold text-zinc-800">{roleLabel}</span> y no cuenta con permisos para acceder a este módulo.
          </p>
          <button
            type="button"
            onClick={() => navigate(homePath, { replace: true })}
            className="mt-6 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <ArrowLeft className="size-4" />
            Volver a mi portal
          </button>
        </div>
      </div>
    )
  }

  return <Outlet />
}