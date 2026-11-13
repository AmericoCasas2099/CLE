import { NavLink, useNavigate } from 'react-router-dom'
import { LogOut, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BrandIcon } from './nav-config'

export function Sidebar({
  nav = [],
  user = {},
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}) {
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('cle_token')
    localStorage.removeItem('cle_user')
    navigate('/login')
  }

  // Generar iniciales en caso de no venir precalculadas
  const initials =
    user.initials ||
    (user.nombre ? `${user.nombre[0]}${user.apellido_paterno ? user.apellido_paterno[0] : ''}` : 'US')

  return (
    <>
      {/* Fondo oscuro traslúcido para móviles */}
      <div
        aria-hidden="true"
        onClick={onCloseMobile}
        className={cn(
          'fixed inset-0 z-40 bg-zinc-950/20 backdrop-blur-[1px] transition-opacity lg:hidden',
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'pointer-events-none opacity-0'
        )}
      />

      {/* Menú lateral */}
      <aside
        aria-label="Navegación principal"
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-zinc-200 bg-white transition-[width,transform] duration-200 ease-out',
          'lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0',
          collapsed ? 'lg:w-[72px]' : 'lg:w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Cabecera del sidebar */}
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-zinc-200 px-4">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
            <BrandIcon className="size-5" aria-hidden="true" />
          </div>
          <div className={cn('min-w-0 flex-1 leading-tight', collapsed && 'lg:hidden')}>
            <p className="truncate text-sm font-semibold text-zinc-900">CLE</p>
            <p className="truncate text-xs text-zinc-500">Plataforma de Idiomas</p>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 lg:hidden"
          >
            <X className="size-5" aria-hidden="true" />
            <span className="sr-only">Cerrar menú</span>
          </button>
        </div>

        {/* Lista de enlaces agrupados */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="flex flex-col gap-5">
            {nav.map((group) => (
              <li key={group.label}>
                <p
                  className={cn(
                    'mb-1.5 px-2.5 text-[11px] font-medium uppercase tracking-wider text-zinc-400',
                    collapsed && 'lg:sr-only'
                  )}
                >
                  {group.label}
                </p>
                <ul className="flex flex-col gap-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon
                    return (
                      <li key={item.label}>
                        <NavLink
                          to={item.path}
                          onClick={onCloseMobile}
                          title={collapsed ? item.label : undefined}
                          className={({ isActive }) =>
                            cn(
                              'group flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                              collapsed && 'lg:justify-center lg:px-0',
                              isActive
                                ? 'bg-indigo-50 font-medium text-indigo-700'
                                : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                            )
                          }
                        >
                          {({ isActive }) => (
                            <>
                              <Icon
                                className={cn(
                                  'size-4 shrink-0',
                                  isActive
                                    ? 'text-indigo-600'
                                    : 'text-zinc-400 group-hover:text-zinc-600'
                                )}
                                aria-hidden="true"
                              />
                              <span className={cn('truncate', collapsed && 'lg:sr-only')}>
                                {item.label}
                              </span>
                            </>
                          )}
                        </NavLink>
                      </li>
                    )
                  })}
                </ul>
              </li>
            ))}
          </ul>
        </nav>

        {/* Botón para expandir / contraer en pantallas de escritorio */}
        <div className="hidden border-t border-zinc-200 px-3 py-2 lg:block">
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-expanded={!collapsed}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900',
              collapsed && 'justify-center px-0'
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="size-4" aria-hidden="true" />
            ) : (
              <PanelLeftClose className="size-4" aria-hidden="true" />
            )}
            <span className={cn(collapsed && 'sr-only')}>
              {collapsed ? 'Expandir menú' : 'Contraer menú'}
            </span>
          </button>
        </div>

        {/* Perfil del usuario activo y botón de salida */}
        <div className="border-t border-zinc-200 p-3">
          <div
            className={cn(
              'flex items-center gap-3 rounded-xl p-2',
              collapsed && 'lg:flex-col lg:gap-2 lg:p-0'
            )}
          >
            <div
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200 uppercase"
              aria-hidden="true"
            >
              {initials}
            </div>
            <div className={cn('min-w-0 flex-1 leading-tight', collapsed && 'lg:hidden')}>
              <p className="truncate text-sm font-medium text-zinc-900">
                {user.nombre || user.correo || 'Usuario CLE'}
              </p>
              <p className="truncate text-xs text-zinc-500">
                <span className="font-mono">{user.role || user.rol || 'Acceso'}</span>
              </p>
            </div>
            <button
              type="button"
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
              onClick={handleLogout}
              className={cn(
                'group flex items-center justify-center rounded-lg border border-rose-200 bg-rose-50 p-2 text-rose-600 transition-all duration-150',
                'hover:border-rose-600 hover:bg-rose-600 hover:text-white hover:shadow-xs active:scale-95',
                collapsed && 'lg:size-9 lg:p-0'
              )}
            >
              <LogOut className="size-4" aria-hidden="true" />
              <span className="sr-only">Cerrar sesión</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}