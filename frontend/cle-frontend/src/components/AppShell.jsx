import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Menu, Bell, ChevronRight } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { NAV_ADMIN, NAV_MAESTRO, NAV_ALUMNO, BrandIcon } from './nav-config'

export function AppShell() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  const user = JSON.parse(localStorage.getItem('cle_user') || '{}')
  const userRole = user.role || user.rol || 'Administrador'

  let navItems = NAV_ADMIN
  if (userRole === 'Maestro') navItems = NAV_MAESTRO
  if (userRole === 'Alumno') navItems = NAV_ALUMNO

  // Mapeo dinámico del breadcrumb según la ruta actual
  const getBreadcrumb = () => {
    const path = location.pathname
    if (path.startsWith('/admin/usuarios')) {
      return { section: 'Acceso y Roles', page: 'Usuarios' }
    }
    if (path.startsWith('/maestros/')) {
      return { section: 'Docencia', page: path.includes('horario') ? 'Mi Horario' : 'Mis Grupos' }
    }
    if (path.startsWith('/alumnos/')) {
      return { section: 'Mi Espacio', page: 'Mi Tablero' }
    }
    return { section: 'Panel Principal', page: 'Dashboard' }
  }

  return (
    <div className="flex min-h-dvh bg-zinc-50/50">
      <Sidebar
        nav={navItems}
        user={user}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra superior con Breadcrumbs y estado institucional */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-200/80 bg-white px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 lg:hidden"
            >
              <Menu className="size-5" />
            </button>

            {/* Migas de pan (Breadcrumbs) */}
            <nav className="flex items-center gap-2 text-sm">
              <span className="font-semibold text-zinc-800">CLE</span>
              <ChevronRight className="size-4 text-zinc-400" />
              <span className="text-zinc-500">{getBreadcrumb().section}</span>
              <ChevronRight className="size-4 text-zinc-400" />
              <span className="font-medium text-zinc-900">{getBreadcrumb().page}</span>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {/* Indicador de Periodo */}
            <div className="flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50/60 px-3 py-1 text-xs font-medium text-indigo-700">
              <span className="size-1.5 rounded-full bg-indigo-600 animate-pulse" />
              Periodo activo: 2026-B
            </div>

            {/* Notificaciones */}
            <button
              type="button"
              className="relative rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
            >
              <Bell className="size-5" />
              <span className="absolute top-2 right-2 size-2 rounded-full bg-indigo-600 ring-2 ring-white" />
            </button>
          </div>
        </header>

        {/* Contenido de la vista */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AppShell