import { useState, useEffect, useMemo } from 'react'
import {
  Search,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Users,
  BookOpen,
  Phone,
  Mail,
  Pencil,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import api from '@/services/api'

const IDIOMAS_SUGERIDOS = [
  'Inglés',
  'Francés',
  'Alemán',
  'Italiano',
  'Japonés',
  'Coreano',
  'Portugués',
  'Español',
]

function getNombreCompleto(m) {
  return [m.nombre, m.apellido_paterno, m.apellido_materno]
    .filter(Boolean)
    .join(' ')
    .trim()
}

function getEstatusInfo(m) {
  const estatusNombre =
    typeof m.estatus === 'object' ? m.estatus?.nombre : m.estatus
  const estatusId = Number(
    typeof m.estatus === 'object' ? m.estatus?.estatus_id : m.estatus_id
  )

  if (estatusNombre === 'Inactivo' || estatusId === 2) {
    return { label: 'Inactivo', isActivo: false }
  }
  return { label: estatusNombre || 'Activo', isActivo: true }
}

export function Maestros() {
  const [maestros, setMaestros] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [academicoWarning, setAcademicoWarning] = useState('')

  // Filtros (CLE-80: estado e idioma/especialidad)
  const [search, setSearch] = useState('')
  const [estatusFilter, setEstatusFilter] = useState('Todos')
  const [idiomaFilter, setIdiomaFilter] = useState('Todos')

  // Modal de actualización (CLE-91)
  const [editingMaestro, setEditingMaestro] = useState(null)
  const [bannerMessage, setBannerMessage] = useState('')

  const consultarMaestros = async () => {
    setLoading(true)
    setError('')
    setAcademicoWarning('')

    try {
      const [resUsuarios, resMaestros] = await Promise.allSettled([
        api.get('/api/v1/usuarios', {
          params: { pagina: 1, limite: 100 },
          skipAuthRedirect: true,
        }),
        api.get('/api/v1/maestros', {
          params: { pagina: 1, limite: 100 },
          skipAuthRedirect: true,
        }),
      ])

      if (resUsuarios.status === 'rejected' && resMaestros.status === 'rejected') {
        const err = resMaestros.reason || resUsuarios.reason
        const msg =
          err?.response?.data?.mensaje ||
          err?.response?.data?.error?.mensaje ||
          err?.response?.data?.detail
        setError(
          typeof msg === 'string'
            ? msg
            : 'No se pudo obtener el listado de maestros desde el servidor.'
        )
        setMaestros([])
        return
      }

      if (resMaestros.status === 'rejected') {
        const statusM = resMaestros.reason?.response?.status
        setAcademicoWarning(
          `No se pudieron cargar los perfiles de academico-service (HTTP ${statusM || 'sin respuesta'}). Verifica que la URL del túnel de academico-service esté configurada en vite.config.js.`
        )
      }

      const usuariosData =
        resUsuarios.status === 'fulfilled' ? resUsuarios.value.data : null
      const usuariosList = Array.isArray(usuariosData?.usuarios)
        ? usuariosData.usuarios
        : Array.isArray(usuariosData)
        ? usuariosData
        : []

      const maestrosData =
        resMaestros.status === 'fulfilled' ? resMaestros.value.data : null
      const perfilesList = Array.isArray(maestrosData?.maestros)
        ? maestrosData.maestros
        : Array.isArray(maestrosData)
        ? maestrosData
        : []

      // Cuentas con rol Maestro (rol_id === 2) en usuarios-service
      const cuentasMaestros = usuariosList.filter(
        (u) => Number(u.rol?.rol_id ?? u.rol_id) === 2
      )

      const perfilesPorUsuarioId = new Map()
      perfilesList.forEach((p) => {
        if (p.usuario_id != null) {
          perfilesPorUsuarioId.set(Number(p.usuario_id), p)
        }
      })

      const combinados = []
      const usuariosProcesados = new Set()

      // 1. Combinar todas las cuentas de maestros con su perfil académico si existe
      cuentasMaestros.forEach((u) => {
        const uId = Number(u.usuario_id)
        usuariosProcesados.add(uId)
        const perfil = perfilesPorUsuarioId.get(uId)

        combinados.push({
          usuario_id: uId,
          correo: u.correo || '',
          maestro_id: perfil?.maestro_id ?? null,
          nombre: perfil?.nombre ?? '',
          apellido_paterno: perfil?.apellido_paterno ?? '',
          apellido_materno: perfil?.apellido_materno ?? '',
          telefono: perfil?.telefono ?? '',
          especialidad: perfil?.especialidad ?? '',
          estatus: perfil?.estatus ?? u.estatus ?? { estatus_id: 1, nombre: 'Activo' },
          estatus_id: perfil?.estatus_id ?? u.estatus?.estatus_id ?? 1,
          tienePerfilAcademico: Boolean(perfil?.maestro_id),
        })
      })

      // 2. Incluir perfiles de academico-service cuyo usuario_id no viniera en usuarios-service
      perfilesList.forEach((p) => {
        const uId = Number(p.usuario_id)
        if (!usuariosProcesados.has(uId)) {
          combinados.push({
            usuario_id: uId,
            correo: '',
            maestro_id: p.maestro_id,
            nombre: p.nombre ?? '',
            apellido_paterno: p.apellido_paterno ?? '',
            apellido_materno: p.apellido_materno ?? '',
            telefono: p.telefono ?? '',
            especialidad: p.especialidad ?? '',
            estatus: p.estatus ?? 'Activo',
            estatus_id: p.estatus_id ?? 1,
            tienePerfilAcademico: true,
          })
        }
      })

      combinados.sort((a, b) => a.usuario_id - b.usuario_id)
      setMaestros(combinados)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    consultarMaestros()
  }, [])

  // Idiomas/especialidades disponibles dinámicamente
  const idiomasDisponibles = useMemo(() => {
    const set = new Set()
    maestros.forEach((m) => {
      if (m.especialidad && m.especialidad.trim()) {
        set.add(m.especialidad.trim())
      }
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'))
  }, [maestros])

  const hasSinEspecialidad = useMemo(
    () => maestros.some((m) => !m.especialidad || !m.especialidad.trim()),
    [maestros]
  )

  const filtrados = maestros.filter((m) => {
    const { label: estatusLabel } = getEstatusInfo(m)
    const matchesEstatus =
      estatusFilter === 'Todos' || estatusLabel === estatusFilter

    const esp = (m.especialidad || '').trim()
    const matchesIdioma =
      idiomaFilter === 'Todos' ||
      (idiomaFilter === '__SIN_ESPECIALIDAD__' ? !esp : esp === idiomaFilter)

    const q = search.trim().toLowerCase()
    if (!q) return matchesEstatus && matchesIdioma

    const nombreCompleto = getNombreCompleto(m).toLowerCase()
    const correoLower = (m.correo || '').toLowerCase()
    const maestroIdStr = String(m.maestro_id || '')
    const userIdStr = String(m.usuario_id || '')
    const espLower = esp.toLowerCase()

    return (
      matchesEstatus &&
      matchesIdioma &&
      (nombreCompleto.includes(q) ||
        correoLower.includes(q) ||
        maestroIdStr.includes(q) ||
        userIdStr.includes(q) ||
        espLower.includes(q))
    )
  })

  const hayFiltrosActivos =
    search.trim() !== '' || estatusFilter !== 'Todos' || idiomaFilter !== 'Todos'

  const limpiarFiltros = () => {
    setSearch('')
    setEstatusFilter('Todos')
    setIdiomaFilter('Todos')
  }

  const handleUpdated = (maestroActualizado, fueCreacion) => {
    setEditingMaestro(null)
    const nombreMostrar =
      getNombreCompleto(maestroActualizado) ||
      maestroActualizado.correo ||
      `Usuario #${maestroActualizado.usuario_id}`

    setBannerMessage(
      fueCreacion
        ? `Perfil académico registrado para ${nombreMostrar} (Maestro #${maestroActualizado.maestro_id}).`
        : `Información del maestro #${maestroActualizado.maestro_id} (${nombreMostrar}) actualizada correctamente.`
    )
    consultarMaestros()
  }

  return (
    <div className="space-y-6 p-8">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Directorio de Maestros
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Consulta las cuentas docentes registradas ({maestros.length} en total), filtra por idioma o estado y actualiza su perfil académico.
          </p>
        </div>

        <button
          type="button"
          onClick={consultarMaestros}
          disabled={loading}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3.5 text-sm font-medium text-zinc-700 shadow-2xs transition-colors hover:bg-zinc-50 disabled:opacity-50"
        >
          <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
          Consultar
        </button>
      </div>

      {/* Alerta si falla conexión con academico-service */}
      {academicoWarning && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <span>{academicoWarning}</span>
          </div>
          <button
            type="button"
            onClick={() => setAcademicoWarning('')}
            className="rounded p-1 text-amber-700 hover:bg-amber-100"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

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

      {/* Tabla y barra de filtros */}
      <section className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4">
          {/* Búsqueda libre */}
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="search"
              placeholder="Buscar por nombre, correo, ID o idioma…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex h-9 w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Controles de filtro por Idioma y Estado */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative flex items-center">
              <BookOpen className="pointer-events-none absolute left-2.5 size-3.5 text-zinc-400" />
              <select
                aria-label="Filtrar por idioma o especialidad"
                value={idiomaFilter}
                onChange={(e) => setIdiomaFilter(e.target.value)}
                className="h-9 rounded-lg border border-zinc-200 bg-white pl-8 pr-7 text-xs font-medium text-zinc-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="Todos">Todos los idiomas</option>
                {idiomasDisponibles.map((idioma) => (
                  <option key={idioma} value={idioma}>
                    {idioma}
                  </option>
                ))}
                {hasSinEspecialidad && (
                  <option value="__SIN_ESPECIALIDAD__">Sin idioma asignado</option>
                )}
              </select>
            </div>

            <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-1">
              {[
                { value: 'Todos', label: 'Todos' },
                { value: 'Activo', label: 'Activos' },
                { value: 'Inactivo', label: 'Inactivos' },
              ].map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setEstatusFilter(tab.value)}
                  className={cn(
                    'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                    estatusFilter === tab.value
                      ? 'bg-white text-zinc-900 shadow-2xs'
                      : 'text-zinc-600 hover:text-zinc-900'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {hayFiltrosActivos && (
              <button
                type="button"
                onClick={limpiarFiltros}
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
              >
                <X className="size-3.5" />
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* Contenido */}
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-zinc-500">
            <Loader2 className="size-4 animate-spin text-indigo-600" />
            Consultando maestros en el servidor…
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-rose-50 text-rose-600">
              <AlertCircle className="size-5" />
            </div>
            <p className="max-w-md text-sm font-medium text-rose-700">{error}</p>
            <button
              type="button"
              onClick={consultarMaestros}
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
            <h3 className="mt-3 text-sm font-semibold text-zinc-900">
              Sin maestros encontrados
            </h3>
            <p className="mt-1 max-w-sm text-xs text-zinc-500">
              No hay docentes registrados que coincidan con los filtros seleccionados.
            </p>
            {hayFiltrosActivos && (
              <button
                type="button"
                onClick={limpiarFiltros}
                className="mt-4 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Restablecer filtros
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50/60 text-left text-xs text-zinc-500">
                    <th className="px-5 py-2.5 font-medium">IDs</th>
                    <th className="px-5 py-2.5 font-medium">Docente / Cuenta</th>
                    <th className="px-5 py-2.5 font-medium">Idioma / Especialidad</th>
                    <th className="px-5 py-2.5 font-medium">Teléfono</th>
                    <th className="px-5 py-2.5 font-medium">Estado</th>
                    <th className="px-5 py-2.5 text-right font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filtrados.map((m) => {
                    const { label: estatusLabel, isActivo } = getEstatusInfo(m)
                    const nombreCompleto = getNombreCompleto(m)

                    return (
                      <tr
                        key={`${m.usuario_id}-${m.maestro_id ?? 'pendiente'}`}
                        className="transition-colors hover:bg-zinc-50/70"
                      >
                        <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-zinc-500">
                          <div className="flex flex-col">
                            <span className="font-semibold text-zinc-700">
                              {m.maestro_id ? `Maestro #${m.maestro_id}` : 'Sin perfil'}
                            </span>
                            <span className="text-[11px] text-zinc-400">
                              Usuario #{m.usuario_id}
                            </span>
                          </div>
                        </td>

                        <td className="whitespace-nowrap px-5 py-3">
                          <div className="flex flex-col">
                            {nombreCompleto ? (
                              <span className="font-medium text-zinc-900">
                                {nombreCompleto}
                              </span>
                            ) : (
                              <span className="inline-flex w-fit items-center rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                                Perfil académico pendiente
                              </span>
                            )}
                            {m.correo && (
                              <span className="mt-0.5 inline-flex items-center gap-1 text-xs text-zinc-500">
                                <Mail className="size-3 text-zinc-400" />
                                {m.correo}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="whitespace-nowrap px-5 py-3">
                          {m.especialidad ? (
                            <span className="inline-flex items-center rounded-md bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                              {m.especialidad}
                            </span>
                          ) : (
                            <span className="text-xs text-zinc-400">No especificado</span>
                          )}
                        </td>

                        <td className="whitespace-nowrap px-5 py-3 text-xs text-zinc-600">
                          {m.telefono ? (
                            <span className="inline-flex items-center gap-1.5 font-mono">
                              <Phone className="size-3 text-zinc-400" />
                              {m.telefono}
                            </span>
                          ) : (
                            <span className="text-zinc-400">—</span>
                          )}
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

                        <td className="whitespace-nowrap px-5 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setBannerMessage('')
                              setEditingMaestro(m)
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 hover:text-indigo-600"
                          >
                            <Pencil className="size-3.5" />
                            {m.tienePerfilAcademico ? 'Actualizar' : 'Completar perfil'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 bg-zinc-50/50 px-5 py-3 text-xs text-zinc-500">
              <p>
                Mostrando <span className="font-medium text-zinc-900">{filtrados.length}</span> de{' '}
                <span className="font-medium text-zinc-900">{maestros.length}</span> cuentas docentes
              </p>
            </div>
          </>
        )}
      </section>

      {/* MODAL DE ACTUALIZACIÓN / ALTA DE PERFIL DE MAESTRO (CLE-91) */}
      {editingMaestro && (
        <ActualizarMaestroModal
          maestro={editingMaestro}
          onClose={() => setEditingMaestro(null)}
          onSuccess={handleUpdated}
        />
      )}
    </div>
  )
}

function ActualizarMaestroModal({ maestro, onClose, onSuccess }) {
  const esNuevoPerfil = !maestro.maestro_id
  const initialNombre = maestro.nombre || ''
  const initialApellidoPaterno = maestro.apellido_paterno || ''
  const initialApellidoMaterno = maestro.apellido_materno || ''
  const initialTelefono = maestro.telefono || ''
  const initialEspecialidad = maestro.especialidad || ''
  const { label: initialEstatus } = getEstatusInfo(maestro)

  const [nombre, setNombre] = useState(initialNombre)
  const [apellidoPaterno, setApellidoPaterno] = useState(initialApellidoPaterno)
  const [apellidoMaterno, setApellidoMaterno] = useState(initialApellidoMaterno)
  const [telefono, setTelefono] = useState(initialTelefono)
  const [especialidad, setEspecialidad] = useState(initialEspecialidad)
  const [estatus, setEstatus] = useState(initialEstatus)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const nombreLimpio = nombre.trim()
    const paternoLimpio = apellidoPaterno.trim()
    const maternoLimpio = apellidoMaterno.trim()
    const telefonoLimpio = telefono.trim()
    const especialidadLimpia = especialidad.trim()

    if (!nombreLimpio) {
      setError('El nombre del maestro es obligatorio.')
      return
    }
    if (!paternoLimpio) {
      setError('El apellido paterno es obligatorio.')
      return
    }
    if (telefonoLimpio && !/^[0-9]{10}$/.test(telefonoLimpio)) {
      setError('El teléfono debe contener exactamente 10 dígitos numéricos.')
      return
    }

    setSubmitting(true)
    try {
      // Caso 1: La cuenta aún no tenía perfil en academico-service (POST /api/v1/maestros)
      if (esNuevoPerfil) {
        const createPayload = {
          usuario_id: Number(maestro.usuario_id),
          nombre: nombreLimpio,
          apellido_paterno: paternoLimpio,
          apellido_materno: maternoLimpio || null,
          telefono: telefonoLimpio || null,
          especialidad: especialidadLimpia || null,
        }

        const resCreate = await api.post('/api/v1/maestros', createPayload)
        const creado = resCreate.data?.maestro || resCreate.data || {}
        const nuevoMaestroId = creado.maestro_id

        if (nuevoMaestroId && estatus === 'Inactivo') {
          try {
            await api.patch(`/api/v1/maestros/${nuevoMaestroId}/estatus`, {
              estatus: 'Inactivo',
            })
          } catch (estErr) {
            if (estErr.response?.status === 400) {
              await api.patch(`/api/v1/maestros/${nuevoMaestroId}/estatus`, {
                estatus_id: 2,
              })
            }
          }
        }

        onSuccess(
          {
            ...maestro,
            ...creado,
            maestro_id: nuevoMaestroId,
            nombre: nombreLimpio,
            apellido_paterno: paternoLimpio,
            apellido_materno: maternoLimpio || null,
            telefono: telefonoLimpio || null,
            especialidad: especialidadLimpia || null,
            estatus,
          },
          true
        )
        return
      }

      // Caso 2: El maestro ya existe -> PATCH /api/v1/maestros/:id (ModificarMaestro)
      const patchPayload = {}
      if (nombreLimpio !== initialNombre) patchPayload.nombre = nombreLimpio
      if (paternoLimpio !== initialApellidoPaterno) {
        patchPayload.apellido_paterno = paternoLimpio
      }
      if (maternoLimpio !== (initialApellidoMaterno || '')) {
        patchPayload.apellido_materno = maternoLimpio || null
      }
      if (telefonoLimpio !== (initialTelefono || '')) {
        patchPayload.telefono = telefonoLimpio || null
      }
      if (especialidadLimpia !== (initialEspecialidad || '')) {
        patchPayload.especialidad = especialidadLimpia || null
      }

      const cambioEstatus = estatus !== initialEstatus

      if (Object.keys(patchPayload).length === 0 && !cambioEstatus) {
        onClose()
        return
      }

      let actualizado = { ...maestro }

      if (Object.keys(patchPayload).length > 0) {
        const resPatch = await api.patch(
          `/api/v1/maestros/${maestro.maestro_id}`,
          patchPayload
        )
        if (resPatch.data?.maestro) {
          actualizado = { ...actualizado, ...resPatch.data.maestro }
        }
      }

      if (cambioEstatus) {
        let resEst
        try {
          resEst = await api.patch(`/api/v1/maestros/${maestro.maestro_id}/estatus`, {
            estatus,
          })
        } catch (estErr) {
          if (estErr.response?.status === 400) {
            resEst = await api.patch(`/api/v1/maestros/${maestro.maestro_id}/estatus`, {
              estatus_id: estatus === 'Activo' ? 1 : 2,
            })
          } else {
            throw estErr
          }
        }
        if (resEst?.data?.maestro) {
          actualizado = { ...actualizado, ...resEst.data.maestro }
        }
      }

      onSuccess(
        {
          ...actualizado,
          nombre: nombreLimpio,
          apellido_paterno: paternoLimpio,
          apellido_materno: maternoLimpio || null,
          telefono: telefonoLimpio || null,
          especialidad: especialidadLimpia || null,
          estatus,
        },
        false
      )
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

      setError(
        typeof msg === 'string'
          ? msg
          : 'No se pudo actualizar la información del maestro.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 p-4 backdrop-blur-[1px]">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-zinc-200 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">
              {esNuevoPerfil
                ? `Registrar Perfil Docente · Usuario #${maestro.usuario_id}`
                : `Actualizar Maestro #${maestro.maestro_id}`}
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              {maestro.correo || `Cuenta asociada Usuario #${maestro.usuario_id}`}
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
              <label htmlFor="maestro-nombre" className="text-xs font-medium text-zinc-700">
                Nombre(s) <span className="text-rose-500">*</span>
              </label>
              <input
                id="maestro-nombre"
                type="text"
                placeholder="Ej. Christopher"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="maestro-paterno" className="text-xs font-medium text-zinc-700">
                  Apellido paterno <span className="text-rose-500">*</span>
                </label>
                <input
                  id="maestro-paterno"
                  type="text"
                  placeholder="Ej. Vega"
                  value={apellidoPaterno}
                  onChange={(e) => setApellidoPaterno(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="maestro-materno" className="text-xs font-medium text-zinc-700">
                  Apellido materno <span className="font-normal text-zinc-400">(opcional)</span>
                </label>
                <input
                  id="maestro-materno"
                  type="text"
                  placeholder="Ej. Ángeles"
                  value={apellidoMaterno}
                  onChange={(e) => setApellidoMaterno(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="maestro-idioma" className="text-xs font-medium text-zinc-700">
                  Idioma / Especialidad
                </label>
                <input
                  id="maestro-idioma"
                  list="idiomas-cle-list"
                  type="text"
                  placeholder="Ej. Inglés"
                  value={especialidad}
                  onChange={(e) => setEspecialidad(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <datalist id="idiomas-cle-list">
                  {IDIOMAS_SUGERIDOS.map((idioma) => (
                    <option key={idioma} value={idioma} />
                  ))}
                </datalist>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="maestro-tel" className="text-xs font-medium text-zinc-700">
                  Teléfono (10 dígitos)
                </label>
                <input
                  id="maestro-tel"
                  type="tel"
                  maxLength={10}
                  placeholder="4421234567"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ''))}
                  className="flex h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 font-mono text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="maestro-estatus" className="text-xs font-medium text-zinc-700">
                Estado del maestro
              </label>
              <select
                id="maestro-estatus"
                value={estatus}
                onChange={(e) => setEstatus(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
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
              {esNuevoPerfil ? 'Registrar Perfil' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Maestros