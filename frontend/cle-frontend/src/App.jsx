import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Login } from './pages/Login'
import { AppShell } from './components/AppShell'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Dashboard } from './pages/admin/Dashboard'
import { MisGrupos } from './pages/maestro/MisGrupos'
import { MiHorario } from './pages/maestro/MiHorario'
import { MiTablero } from './pages/alumno/MiTablero'
import { Usuarios } from './pages/admin/Usuarios'
import { Maestros } from './pages/admin/Maestros'
import { Alumnos } from './pages/admin/Alumnos'

function ModuloPendiente() {
  return (
    <div className="flex h-full min-h-[60vh] flex-col items-center justify-center p-8 text-center">
      <h2 className="text-lg font-semibold text-zinc-900">Módulo en construcción</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Esta sección está pendiente de integración con el microservicio correspondiente.
      </p>
    </div>
  )
}
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Rutas exclusivas de Administrador (rol_id: 1) */}
        <Route element={<ProtectedRoute allowedRoles={[1]} />}>
          <Route element={<AppShell />}>
            <Route path="/admin/dashboard" element={<Dashboard />} />
            <Route path="/admin/usuarios" element={<Usuarios />} />
            <Route path="/admin/maestros" element={<Maestros />} />
            <Route path="/admin/alumnos" element={<Alumnos />} />
            <Route path="/admin/*" element={<ModuloPendiente />} />
          </Route>
        </Route>

        {/* Rutas exclusivas de Maestro (rol_id: 2) */}
        <Route element={<ProtectedRoute allowedRoles={[2]} />}>
          <Route element={<AppShell />}>
            <Route path="/maestros/grupos" element={<MisGrupos />} />
            <Route path="/maestros/horario" element={<MiHorario />} />
          </Route>
        </Route>

        {/* Rutas exclusivas de Alumno (rol_id: 3) */}
        <Route element={<ProtectedRoute allowedRoles={[3]} />}>
          <Route element={<AppShell />}>
            <Route path="/alumnos/mitablero" element={<MiTablero />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}