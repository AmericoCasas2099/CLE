import { useState, useEffect } from 'react'
import {
  ShieldCheck,
  Presentation,
  GraduationCap,
  UserPlus,
  Pencil,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Search,
  RefreshCw,
  X,
  Users,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import api from '@/services/api'

const ROLES_DISPONIBLES = [
  {
    id: 1,
    nombre: 'Administrador',
    descripcion: 'Control total de catálogos, infraestructura y usuarios.',
    icon: ShieldCheck,
  },
  {
    id: 2,
    nombre: 'Maestro',
    descripcion: 'Consulta de grupos asignados y horarios docentes.',
    icon: Presentation,
  },
  {
    id: 3,
    nombre: 'Alumno',
    descripcion: 'Inscripción a grupos, horario e historial académico.',
    icon: GraduationCap,
  },
]

function formatFecha(isoString) {
  if (!isoString) return '—'
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function Usuarios() {
  // Estado principal de Consulta y Paginación (GET /api/v1/usuarios)
  const [usuarios, setUsuarios] = useState([])
  const [total, setTotal] = useState(0)
  const [pagina, setPagina] = useState(1)
  const [limite] = useState(20)

  const [loadingList, setLoadingList] = useState(true)
  const [listError, setListError] = useState('')
  const [search, setSearch] = useState('')
  const [rolFilter, setRolFilter] = useState('Todos')

  // Control independiente de Modales (Crear vs Actualizar)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [bannerMessage, setBannerMessage] = useState('')

  const consultarUsuarios = async (targetPage = pagina) => {
    setLoadingList(true)
    setListError('')
    try {
      const res = await api.get('/api/v1/usuarios', {
        params: { pagina: targetPage, limite },
        skipAuthRedirect: true,
      })
      const data = res.data || {}
      const lista = Array.isArray(data.usuarios) ? data.usuarios : []

      setUsuarios(lista)
      setTotal(Number(data.total ?? lista.length))
      setPagina(Number(data.pagina ?? targetPage))
    } catch (err) {
      const status = err.response?.status
      const msg =
        err.response?.data?.mensaje ||
        err.response?.data?.detail ||
        err.response?.data?.error?.mensaje
      if (status === 401 || status === 403) {
        setListError('No tienes permisos o tu sesión expiró para consultar el listado.')
      } else {
        setListError(
          typeof msg === 'string'
            ? msg
            : 'No se pudo obtener la lista de usuarios desde el servidor.'
        )
      }
    } finally {
      setLoadingList(false)
    }
  }

  useEffect(() => {
    consultarUsuarios(1)
  }, [])

  const filtrados = usuarios.filter((u) => {
    const roleId = Number(u.rol?.rol_id ?? u.rol_id)
    const matchesRol = rolFilter === 'Todos' || roleId === Number(rolFilter)

    const q = search.trim().toLowerCase()
    if (!q) return matchesRol
    const mail = (u.correo || '').toLowerCase()
    const idStr = String(u.usuario_id || '')
    return matchesRol && (mail.includes(q) || idStr.includes(q))
  })

  const totalPages = Math.max(1, Math.ceil(total / limite))

  const handleCreated = (nuevoUsuario) => {
    setIsCreateOpen(false)
    setBannerMessage(
      `Usuario #${nuevoUsuario.usuario_id} (${nuevoUsuario.correo}) registrado correctamente.`
    )
    consultarUsuarios(1)
  }

  const handleUpdated = (usuarioActualizado) => {
    setUsuarios((prev) =>
      prev.map((u) => (u.usuario_id === usuarioActualizado.usuario_id ? usuarioActualizado : u))
    )
    setEditingUser(null)
    setBannerMessage(
      `Usuario #${usuarioActualizado.usuario_id} (${usuarioActualizado.correo}) actualizado correctamente.`
    )
    consultarUsuarios(pagina)
  }

  return (
    <div className="space-y-6 p-8">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Gestión de Usuarios
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Consulta las cuentas registradas ({total} en total), da de alta accesos o actualiza roles y estatus.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => consultarUsuarios(pagina)}
            disabled={loadingList}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3.5 text-sm font-medium text-zinc-700 shadow-2xs transition-colors hover:bg-zinc-50 disabled:opacity-50"
          >
            <RefreshCw className={cn('size-4', loadingList && 'animate-spin')} />
            Consultar
          </button>

          <button
            type="button"
            onClick={() => {
              setBannerMessage('')
              setIsCreateOpen(true)
            }}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white shadow-xs transition-colors hover:bg-indigo-700"
          >
            <UserPlus className="size-4" />
            Nuevo Usuario
          </button>
        </div>
      </div>

      {/* Banner de confirmación */}
      {bannerMessage && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
            <span>{bannerMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setBannerMessage('')}
            className="rounded p-1 text-emerald-700 hover:bg-emerald-100"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* TABLA PRINCIPAL DE CONSULTA */}
      <section className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="search"
              placeholder="Buscar por correo o ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex h-9 w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="inline-flex flex-wrap rounded-lg border border-zinc-200 bg-zinc-50 p-1">
            {[
              { value: 'Todos', label: 'Todos' },
              { value: '1', label: 'Administradores' },
              { value: '2', label: 'Maestros' },
              { value: '3', label: 'Alumnos' },
            ].map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setRolFilter(tab.value)}
                className={cn(
                  'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                  rolFilter === tab.value
                    ? 'bg-white text-zinc-900 shadow-2xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {loadingList ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-zinc-500">
            <Loader2 className="size-4 animate-spin text-indigo-600" />
            Consultando usuarios en el servidor…
          </div>
        ) : listError ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-rose-50 text-rose-600">
              <AlertCircle className="size-5" />
            </div>
            <p className="max-w-md text-sm font-medium text-rose-700">{listError}</p>
            <button
              type="button"
              onClick={() => consultarUsuarios(pagina)}
              className="rounded-lg border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Reintentar consulta
            </button>
          </div>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="flex size-11 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500">
              <Users className="size-5" />
            </div>
            <h3 className="mt-3 text-sm font-semibold text-zinc-900">Sin usuarios encontrados</h3>
            <p className="mt-1 max-w-sm text-xs text-zinc-500">
              No hay registros que coincidan con el filtro en esta página.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50/60 text-left text-xs text-zinc-500">
                    <th className="px-5 py-2.5 font-medium">ID</th>
                    <th className="px-5 py-2.5 font-medium">Correo electrónico</th>
                    <th className="px-5 py-2.5 font-medium">Rol</th>
                    <th className="px-5 py-2.5 font-medium">Estatus</th>
                    <th className="px-5 py-2.5 font-medium">Fecha creación</th>
                    <th className="px-5 py-2.5 text-right font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filtrados.map((u) => {
                    const roleId = Number(u.rol?.rol_id ?? u.rol_id)
                    const roleLabel =
                      u.rol?.nombre ||
                      (roleId === 1 ? 'Administrador' : roleId === 2 ? 'Maestro' : 'Alumno')
                    const estatusId = Number(u.estatus?.estatus_id ?? u.estatus_id ?? 1)
                    const estatusLabel =
                      u.estatus?.nombre || (estatusId === 1 ? 'Activo' : 'Inactivo')
                    const isActivo = estatusId === 1 && estatusLabel === 'Activo'

                    return (
                      <tr key={u.usuario_id} className="transition-colors hover:bg-zinc-50/70">
                        <td className="whitespace-nowrap px-5 py-3 font-mono text-xs font-medium text-zinc-500">
                          #{u.usuario_id}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 font-medium text-zinc-900">
                          {u.correo}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3">
                          <span
                            className={cn(
                              'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
                              roleId === 1
                                ? 'bg-indigo-50 text-indigo-700'
                                : roleId === 2
                                ? 'bg-amber-50 text-amber-800'
                                : 'bg-zinc-100 text-zinc-700'
                            )}
                          >
                            {roleLabel}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3">
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
                              isActivo
                                ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                                : 'bg-rose-50 text-rose-700 ring-rose-600/20'
                            )}
                          >
                            {estatusLabel}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-xs text-zinc-500">
                          {formatFecha(u.fecha_creacion)}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setBannerMessage('')
                              setEditingUser(u)
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 hover:text-indigo-600"
                          >
                            <Pencil className="size-3.5" />
                            Actualizar
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pie de Paginación sincronizado con { total, pagina, limite } */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 bg-zinc-50/50 px-5 py-3 text-xs text-zinc-500">
              <p>
                Mostrando <span className="font-medium text-zinc-900">{filtrados.length}</span> de{' '}
                <span className="font-medium text-zinc-900">{total}</span> registros · Página{' '}
                <span className="font-medium text-zinc-900">{pagina}</span> de{' '}
                <span className="font-medium text-zinc-900">{totalPages}</span>
              </p>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={pagina <= 1 || loadingList}
                  onClick={() => consultarUsuarios(pagina - 1)}
                  className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 font-medium text-zinc-700 hover:bg-zinc-50 disabled:pointer-events-none disabled:opacity-40"
                >
                  <ChevronLeft className="size-3.5" />
                  Anterior
                </button>
                <button
                  type="button"
                  disabled={pagina >= totalPages || loadingList}
                  onClick={() => consultarUsuarios(pagina + 1)}
                  className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 font-medium text-zinc-700 hover:bg-zinc-50 disabled:pointer-events-none disabled:opacity-40"
                >
                  Siguiente
                  <ChevronRight className="size-3.5" />
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {/* MODAL INDEPENDIENTE 1: CREAR USUARIO */}
      {isCreateOpen && (
        <CrearUsuarioModal
          onClose={() => setIsCreateOpen(false)}
          onSuccess={handleCreated}
        />
      )}

      {/* MODAL INDEPENDIENTE 2: ACTUALIZAR USUARIO */}
      {editingUser && (
        <ActualizarUsuarioModal
          usuario={editingUser}
          onClose={() => setEditingUser(null)}
          onSuccess={handleUpdated}
        />
      )}
    </div>
  )
}

function CrearUsuarioModal({ onClose, onSuccess }) {
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [rolId, setRolId] = useState(3)
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!correo.trim() || !correo.includes('@')) {
      setError('Ingresa un correo electrónico válido.')
      return
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        correo: correo.trim(),
        password,
        rol_id: Number(rolId),
      }

      const res = await api.post('/api/v1/usuarios', payload)
      const created = res.data?.usuario || res.data
      const rolObj = ROLES_DISPONIBLES.find((r) => r.id === Number(rolId))

      onSuccess({
        usuario_id: created?.usuario_id ?? Date.now(),
        correo: created?.correo ?? payload.correo,
        rol: created?.rol ?? { rol_id: Number(rolId), nombre: rolObj?.nombre || 'Usuario' },
        estatus: created?.estatus ?? { estatus_id: 1, nombre: 'Activo' },
        fecha_creacion: created?.fecha_creacion ?? new Date().toISOString(),
      })
    } catch (err) {
      const status = err.response?.status
      const msg =
        err.response?.data?.mensaje ||
        err.response?.data?.detail ||
        err.response?.data?.error?.mensaje
      if (status === 409) {
        setError('Este correo ya está registrado.')
      } else {
        setError(typeof msg === 'string' ? msg : 'No se pudo crear el usuario.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 p-4 backdrop-blur-[1px]">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-zinc-200 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">Registrar Nuevo Usuario</h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Crea credenciales de acceso y define su rol operativo
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="max-h-[75vh] space-y-4 overflow-y-auto px-6 py-5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="create-correo" className="text-xs font-medium text-zinc-700">
                Correo electrónico
              </label>
              <input
                id="create-correo"
                type="email"
                placeholder="usuario@queretaro.tecnm.mx"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="create-pass" className="text-xs font-medium text-zinc-700">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    id="create-pass"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mín. 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="flex h-10 w-full rounded-lg border border-zinc-200 bg-white pl-3 pr-9 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="create-confirm" className="text-xs font-medium text-zinc-700">
                  Confirmar contraseña
                </label>
                <input
                  id="create-confirm"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Repite la clave"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  required
                />
              </div>
            </div>

            <fieldset className="space-y-2">
              <legend className="text-xs font-medium text-zinc-700">Rol del usuario</legend>
              <div className="grid grid-cols-1 gap-2">
                {ROLES_DISPONIBLES.map((rol) => {
                  const Icon = rol.icon
                  const selected = Number(rolId) === rol.id
                  return (
                    <button
                      key={rol.id}
                      type="button"
                      onClick={() => setRolId(rol.id)}
                      className={cn(
                        'flex items-center gap-3 rounded-xl border p-3 text-left transition-all',
                        selected
                          ? 'border-indigo-600 bg-indigo-50/60 ring-1 ring-indigo-600'
                          : 'border-zinc-200 bg-white hover:bg-zinc-50'
                      )}
                    >
                      <div
                        className={cn(
                          'flex size-8 shrink-0 items-center justify-center rounded-lg',
                          selected ? 'bg-indigo-600 text-white' : 'bg-zinc-100 text-zinc-600'
                        )}
                      >
                        <Icon className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-zinc-900">{rol.nombre}</span>
                          <span className="font-mono text-[11px] text-zinc-400">rol_id: {rol.id}</span>
                        </div>
                        <p className="text-xs text-zinc-500">{rol.descripcion}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </fieldset>

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                <AlertCircle className="size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-zinc-200 bg-zinc-50 px-6 py-3.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting && <Loader2 className="size-3.5 animate-spin" />}
              Crear Usuario
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ActualizarUsuarioModal({ usuario, onClose, onSuccess }) {
  const initialCorreo = usuario.correo || ''
  const initialRolId = Number(usuario.rol?.rol_id ?? usuario.rol_id ?? 3)
  const initialEstatusId = Number(usuario.estatus?.estatus_id ?? usuario.estatus_id ?? 1)

  const [correo, setCorreo] = useState(initialCorreo)
  const [rolId, setRolId] = useState(initialRolId)
  const [estatusId, setEstatusId] = useState(initialEstatusId)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const correoLimpio = correo.trim()
    if (!correoLimpio || !correoLimpio.includes('@')) {
      setError('Ingresa un correo electrónico válido.')
      return
    }

    const cambioCorreo = correoLimpio !== initialCorreo
    const cambioRol = Number(rolId) !== initialRolId
    const cambioEstatus = Number(estatusId) !== initialEstatusId

    if (!cambioCorreo && !cambioRol && !cambioEstatus) {
      onClose()
      return
    }

    setSubmitting(true)
    try {
      let ultimoUsuario = { ...usuario }
      const rolObj = ROLES_DISPONIBLES.find((r) => r.id === Number(rolId))
      const estatusNombre = Number(estatusId) === 1 ? 'Activo' : 'Inactivo'

      // 1. Actualizar correo (PATCH /api/v1/usuarios/:id)
      if (cambioCorreo) {
        const resCorreo = await api.patch(`/api/v1/usuarios/${usuario.usuario_id}`, {
          correo: correoLimpio,
        })
        if (resCorreo.data?.usuario) {
          ultimoUsuario = { ...ultimoUsuario, ...resCorreo.data.usuario }
        }
      }

      // 2. Actualizar rol (PATCH /api/v1/usuarios/:id/rol)
      if (cambioRol) {
        let resRol
        try {
          resRol = await api.patch(`/api/v1/usuarios/${usuario.usuario_id}/rol`, {
            rol_id: Number(rolId),
          })
        } catch (rolErr) {
          if (rolErr.response?.status === 400 && rolObj?.nombre) {
            resRol = await api.patch(`/api/v1/usuarios/${usuario.usuario_id}/rol`, {
              rol: rolObj.nombre,
            })
          } else {
            throw rolErr
          }
        }
        if (resRol?.data?.usuario) {
          ultimoUsuario = { ...ultimoUsuario, ...resRol.data.usuario }
        }
      }

      // 3. Actualizar estatus (PATCH /api/v1/usuarios/:id/estatus)
      if (cambioEstatus) {
        let resEstatus
        try {
          resEstatus = await api.patch(`/api/v1/usuarios/${usuario.usuario_id}/estatus`, {
            estatus: estatusNombre,
          })
        } catch (estErr) {
          if (estErr.response?.status === 400) {
            resEstatus = await api.patch(`/api/v1/usuarios/${usuario.usuario_id}/estatus`, {
              estatus_id: Number(estatusId),
            })
          } else {
            throw estErr
          }
        }
        if (resEstatus?.data?.usuario) {
          ultimoUsuario = { ...ultimoUsuario, ...resEstatus.data.usuario }
        }
      }

      onSuccess({
        ...ultimoUsuario,
        usuario_id: usuario.usuario_id,
        correo: ultimoUsuario.correo ?? correoLimpio,
        rol: ultimoUsuario.rol ?? { rol_id: Number(rolId), nombre: rolObj?.nombre || 'Usuario' },
        estatus: ultimoUsuario.estatus ?? {
          estatus_id: Number(estatusId),
          nombre: estatusNombre,
        },
      })
    } catch (err) {
      const apiError = err.response?.data?.error
      const detalle = Array.isArray(apiError?.detalles)
        ? apiError.detalles.map((d) => d.mensaje).join(' · ')
        : ''
      const msg =
        detalle ||
        apiError?.mensaje ||
        err.response?.data?.mensaje ||
        err.response?.data?.detail

      setError(typeof msg === 'string' ? msg : 'No se pudieron guardar los cambios del usuario.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 p-4 backdrop-blur-[1px]">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-zinc-200 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">
              Actualizar Usuario #{usuario.usuario_id}
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Modifica correo, rol asignado o estatus de acceso
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-4 px-6 py-5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="edit-correo" className="text-xs font-medium text-zinc-700">
                Correo electrónico
              </label>
              <input
                id="edit-correo"
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="edit-rol" className="text-xs font-medium text-zinc-700">
                  Rol asignado
                </label>
                <select
                  id="edit-rol"
                  value={rolId}
                  onChange={(e) => setRolId(Number(e.target.value))}
                  className="flex h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value={1}>1 · Administrador</option>
                  <option value={2}>2 · Maestro</option>
                  <option value={3}>3 · Alumno</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="edit-estatus" className="text-xs font-medium text-zinc-700">
                  Estatus de cuenta
                </label>
                <select
                  id="edit-estatus"
                  value={estatusId}
                  onChange={(e) => setEstatusId(Number(e.target.value))}
                  className="flex h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value={1}>Activo</option>
                  <option value={2}>Inactivo</option>
                </select>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                <AlertCircle className="size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-zinc-200 bg-zinc-50 px-6 py-3.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting && <Loader2 className="size-3.5 animate-spin" />}
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Usuarios