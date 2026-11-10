import { Navigate, Outlet } from 'react-router-dom'

export function ProtectedRoute({ allowedRoles }) {
  const token = localStorage.getItem('cle_token')
  const user = JSON.parse(localStorage.getItem('cle_user') || 'null')

  // 1. Si no hay token o sesión, redirigir inmediatamente a login
  if (!token || !user) {
    return <Navigate to="/login" replace />
  }

  // 2. Control opcional por rol
  const userRole = user.rol || user.role
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export default ProtectedRoute