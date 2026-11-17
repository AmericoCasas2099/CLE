import { useState, useEffect, useMemo } from 'react'
import {
  Search,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  GraduationCap,
  UserPlus,
  Link2,
  Phone,
  Mail,
  Pencil,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import api from '@/services/api'

const CARRERAS_FALLBACK = [
  { carrera_id: 1, nombre: 'Ingeniería en Sistemas Computacionales' },
  { carrera_id: 2, nombre: 'Ingeniería Industrial' },
  { carrera_id: 3, nombre: 'Ingeniería Mecatrónica' },
  { carrera_id: 4, nombre: 'Ingeniería Electrónica' },
  { carrera_id: 5, nombre: 'Ingeniería en Gestión Empresarial' },
  { carrera_id: 6, nombre: 'Arquitectura' },
]

function getNombreCompleto(a) {
  return [a.nombre, a.apellido_paterno, a.apellido_materno]
    .filter(Boolean)
    .join(' ')
    .trim()
}

function getTipoAlumnoInfo(a) {
  const tipoId = Number(
    typeof a.tipo_alumno === 'object' ? a.tipo_alumno?.tipo_alumno_id : a.tipo_alumno_id
  )
  const tipoNombre =
    typeof a.tipo_alumno === 'object' ? a.tipo_alumno?.nombre : a.tipo_alumno

  if (tipoId === 2 || tipoNombre === 'Externo') {
    return { id: 2, label: 'Externo', isInterno: false }
  }
  if (tipoId === 1 || tipoNombre === 'Interno') {
    return { id: 1, label: 'Interno', isInterno: true }
  }
  return { id: null, label: 'Sin definir', isInterno: false }
}

function getEstatusInfo(a) {
  const estatusNombre =
    typeof a.estatus === 'object' ? a.estatus?.nombre : a.estatus
  const estatusId = Number(
    typeof a.estatus === 'object' ? a.estatus?.estatus_id : a.estatus_id
  )

  if (estatusNombre === 'Inactivo' || estatusId === 2) {
    return { label: 'Inactivo', isActivo: false }
  }
  return { label: estatusNombre || 'Activo', isActivo: true }
}

export function Alumnos() {
  const [alumnos, setAlumnos] = useState([])
  const [carreras, setCarreras] = useState(CARRERAS_FALLBACK)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [academicoWarning, setAcademicoWarning] = useState('')

  // Filtros
  const [search, setSearch] = useState('')
  const [tipoFilter, setTipoFilter] = useState('Todos')
  const [vinculacionFilter, setVinculacionFilter] = useState('Todos')

  // Modal de vinculación / alta / edición
  const [modalAlumno, setModalAlumno] = useState(null)
  const [bannerMessage, setBannerMessage] = useState('')

  const consultarAlumnos = async () => {
    setLoading(true)
    setError('')
    setAcademicoWarning('')

    try {
      const [resUsuarios, resAlumnos, resCarreras] = await Promise.allSettled([
        api.get('/api/v1/usuarios', {
          params: { pagina: 1, limite: 100 },
          skipAuthRedirect: true,
        }),
        api.get('/api/v1/alumnos', {
          params: { pagina: 1, limite: 100 },
          skipAuthRedirect: true,
        }),
        api.get('/api/v1/catalogos/carreras', {
          skipAuthRedirect: true,
        }),
      ])

      if (resUsuarios.status === 'rejected' && resAlumnos.status === 'rejected') {
        const err = resAlumnos.reason || resUsuarios.reason
        const msg =
          err?.response?.data?.mensaje ||
          err?.response?.data?.error?.mensaje ||
          err?.response?.data?.detail
        setError(
          typeof msg === 'string'
            ? msg
            : 'No se pudo obtener el listado de alumnos desde el servidor.'
        )
        setAlumnos([])
        return
      }

      if (resAlumnos.status === 'rejected') {
        const statusA = resAlumnos.reason?.response?.status
        setAcademicoWarning(
          `No se pudieron cargar los perfiles de academico-service (HTTP ${statusA || 'sin respuesta'}).`
        )
      }

      if (resCarreras.status === 'fulfilled') {
        const rawCarreras = resCarreras.value.data?.carreras || resCarreras.value.data
        if (Array.isArray(rawCarreras) && rawCarreras.length > 0) {
          setCarreras(rawCarreras)
        }
      }

      const usuariosData =
        resUsuarios.status === 'fulfilled' ? resUsuarios.value.data : null
      const usuariosList = Array.isArray(usuariosData?.usuarios)
        ? usuariosData.usuarios
        : Array.isArray(usuariosData)
        ? usuariosData
        : []

      const alumnosData =
        resAlumnos.status === 'fulfilled' ? resAlumnos.value.data : null
      const perfilesList = Array.isArray(alumnosData?.alumnos)
        ? alumnosData.alumnos
        : Array.isArray(alumnosData)
        ? alumnosData
        : []

      // Cuentas con rol Alumno (rol_id === 3) en usuarios-service
      const cuentasAlumnos = usuariosList.filter(
        (u) => Number(u.rol?.rol_id ?? u.rol_id) === 3
      )

      const perfilesPorUsuarioId = new Map()
      perfilesList.forEach((p) => {
        if (p.usuario_id != null) {
          perfilesPorUsuarioId.set(Number(p.usuario_id), p)
        }
      })

      const combinados = []
      const usuariosProcesados = new Set()

      cuentasAlumnos.forEach((u) => {
        const uId = Number(u.usuario_id)
        usuariosProcesados.add(uId)
        const perfil = perfilesPorUsuarioId.get(uId)

        combinados.push({
          usuario_id: uId,
          correo: u.correo || '',
          alumno_id: perfil?.alumno_id ?? null,
          tipo_alumno_id: perfil?.tipo_alumno_id ?? null,
          tipo_alumno: perfil?.tipo_alumno ?? null,
          matricula: perfil?.matricula ?? '',
          nombre: perfil?.nombre ?? '',
          apellido_paterno: perfil?.apellido_paterno ?? '',
          apellido_materno: perfil?.apellido_materno ?? '',
          telefono: perfil?.telefono ?? '',
          carrera_id: perfil?.carrera_id ?? null,
          carrera: perfil?.carrera ?? null,
          semestre: perfil?.semestre ?? null,
          estatus: perfil?.estatus ?? u.estatus ?? { estatus_id: 1, nombre: 'Activo' },
          estatus_id: perfil?.estatus_id ?? u.estatus?.estatus_id ?? 1,
          estaVinculado: Boolean(perfil?.alumno_id),
        })
      })

      perfilesList.forEach((p) => {
        const uId = Number(p.usuario_id)
        if (!usuariosProcesados.has(uId)) {
          combinados.push({
            usuario_id: uId,
            correo: '',
            alumno_id: p.alumno_id,
            tipo_alumno_id: p.tipo_alumno_id ?? null,
            tipo_alumno: p.tipo_alumno ?? null,
            matricula: p.matricula ?? '',
            nombre: p.nombre ?? '',
            apellido_paterno: p.apellido_paterno ?? '',
            apellido_materno: p.apellido_materno ?? '',
            telefono: p.telefono ?? '',
            carrera_id: p.carrera_id ?? null,
            carrera: p.carrera ?? null,
            semestre: p.semestre ?? null,
            estatus: p.estatus ?? 'Activo',
            estatus_id: p.estatus_id ?? 1,
            estaVinculado: true,
          })
        }
      })

      combinados.sort((a, b) => a.usuario_id - b.usuario_id)
      setAlumnos(combinados)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    consultarAlumnos()
  }, [])

  const cuentasSinVincular = useMemo(
    () => alumnos.filter((a) => !a.estaVinculado),
    [alumnos]
  )

  const filtrados = alumnos.filter((a) => {
    const tipoInfo = getTipoAlumnoInfo(a)
    const matchesTipo =
      tipoFilter === 'Todos' || tipoInfo.label === tipoFilter

    const matchesVinculacion =
      vinculacionFilter === 'Todos' ||
      (vinculacionFilter === 'Vinculados' && a.estaVinculado) ||
      (vinculacionFilter === 'Pendientes' && !a.estaVinculado)

    const q = search.trim().toLowerCase()
    if (!q) return matchesTipo && matchesVinculacion

    const nombreCompleto = getNombreCompleto(a).toLowerCase()
    const correoLower = (a.correo || '').toLowerCase()
    const matriculaLower = (a.matricula || '').toLowerCase()
    const alumnoIdStr = String(a.alumno_id || '')
    const userIdStr = String(a.usuario_id || '')

    return (
      matchesTipo &&
      matchesVinculacion &&
      (nombreCompleto.includes(q) ||
        correoLower.includes(q) ||
        matriculaLower.includes(q) ||
        alumnoIdStr.includes(q) ||
        userIdStr.includes(q))
    )
  })

  const hayFiltrosActivos =
    search.trim() !== '' || tipoFilter !== 'Todos' || vinculacionFilter !== 'Todos'

  const limpiarFiltros = () => {
    setSearch('')
    setTipoFilter('Todos')
    setVinculacionFilter('Todos')
  }

  const handleSuccess = (alumnoGuardado, esNuevo) => {
    setModalAlumno(null)
    const nombreMostrar =
      getNombreCompleto(alumnoGuardado) ||
      alumnoGuardado.correo ||
      `Usuario #${alumnoGuardado.usuario_id}`

    setBannerMessage(
      esNuevo
        ? `Alumno #${alumnoGuardado.alumno_id} (${nombreMostrar}) vinculado correctamente a Usuario #${alumnoGuardado.usuario_id}.`
        : `Datos del alumno #${alumnoGuardado.alumno_id} (${nombreMostrar}) actualizados correctamente.`
    )
    consultarAlumnos()
  }

  const getNombreCarrera = (a) => {
    if (typeof a.carrera === 'object' && a.carrera?.nombre) return a.carrera.nombre
    if (typeof a.carrera === 'string' && a.carrera) return a.carrera
    if (!a.carrera_id) return null
    const found = carreras.find((c) => Number(c.carrera_id) === Number(a.carrera_id))
    return found ? found.nombre : `Carrera #${a.carrera_id}`
  }

  return (
    <div className="space-y-6 p-8">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Directorio y Vinculación de Alumnos
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Administra las cuentas estudiantiles ({alumnos.length} en total) y vincula su perfil académico interno o externo.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={consultarAlumnos}
            disabled={loading}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3.5 text-sm font-medium text-zinc-700 shadow-2xs transition-colors hover:bg-zinc-50 disabled:opacity-50"
          >
            <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
            Consultar
          </button>

          <button
            type="button"
            onClick={() => {
              setBannerMessage('')
              setModalAlumno(
                cuentasSinVincular[0] || {
                  usuario_id: '',
                  correo: '',
                  alumno_id: null,
                  tipo_alumno_id: 1,
                }
              )
            }}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white shadow-2xs transition-colors hover:bg-indigo-700"
          >
            <UserPlus className="size-4" />
            Vincular Alumno
          </button>
        </div>
      </div>

      {/* Aviso si falla academico-service */}
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

      {/* Tabla y filtros */}
      <section className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4">
          {/* Búsqueda */}
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="search"
              placeholder="Buscar por nombre, matrícula, correo o ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex h-9 w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Filtros de vinculación y tipo de alumno */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-1">
              {[
                { value: 'Todos', label: 'Todos' },
                { value: 'Vinculados', label: 'Vinculados' },
                { value: 'Pendientes', label: 'Sin vincular' },
              ].map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setVinculacionFilter(tab.value)}
                  className={cn(
                    'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                    vinculacionFilter === tab.value
                      ? 'bg-white text-zinc-900 shadow-2xs'
                      : 'text-zinc-600 hover:text-zinc-900'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-1">
              {[
                { value: 'Todos', label: 'Todos los tipos' },
                { value: 'Interno', label: 'Internos' },
                { value: 'Externo', label: 'Externos' },
              ].map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setTipoFilter(tab.value)}
                  className={cn(
                    'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                    tipoFilter === tab.value
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
            Consultando alumnos en el servidor…
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-rose-50 text-rose-600">
              <AlertCircle className="size-5" />
            </div>
            <p className="max-w-md text-sm font-medium text-rose-700">{error}</p>
            <button
              type="button"
              onClick={consultarAlumnos}
              className="rounded-lg border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Reintentar consulta
            </button>
          </div>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="flex size-11 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500">
              <GraduationCap className="size-5" />
            </div>
            <h3 className="mt-3 text-sm font-semibold text-zinc-900">
              Sin alumnos encontrados
            </h3>
            <p className="mt-1 max-w-sm text-xs text-zinc-500">
              No hay registros estudiantiles que coincidan con los filtros seleccionados.
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
              <table className="w-full min-w-[920px] text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50/60 text-left text-xs text-zinc-500">
                    <th className="px-5 py-2.5 font-medium">IDs</th>
                    <th className="px-5 py-2.5 font-medium">Alumno / Cuenta</th>
                    <th className="px-5 py-2.5 font-medium">Tipo</th>
                    <th className="px-5 py-2.5 font-medium">Datos Escolares</th>
                    <th className="px-5 py-2.5 font-medium">Teléfono</th>
                    <th className="px-5 py-2.5 font-medium">Estado</th>
                    <th className="px-5 py-2.5 text-right font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filtrados.map((a) => {
                    const nombreCompleto = getNombreCompleto(a)
                    const tipoInfo = getTipoAlumnoInfo(a)
                    const { label: estatusLabel, isActivo } = getEstatusInfo(a)
                    const carreraNombre = getNombreCarrera(a)

                    return (
                      <tr
                        key={`${a.usuario_id}-${a.alumno_id ?? 'pendiente'}`}
                        className="transition-colors hover:bg-zinc-50/70"
                      >
                        <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-zinc-500">
                          <div className="flex flex-col">
                            <span className="font-semibold text-zinc-700">
                              {a.alumno_id ? `Alumno #${a.alumno_id}` : 'Sin vincular'}
                            </span>
                            <span className="text-[11px] text-zinc-400">
                              Usuario #{a.usuario_id}
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
                                Pendiente de vinculación
                              </span>
                            )}
                            {a.correo && (
                              <span className="mt-0.5 inline-flex items-center gap-1 text-xs text-zinc-500">
                                <Mail className="size-3 text-zinc-400" />
                                {a.correo}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="whitespace-nowrap px-5 py-3">
                          {a.estaVinculado ? (
                            <span
                              className={cn(
                                'inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium',
                                tipoInfo.isInterno
                                  ? 'bg-indigo-50 text-indigo-700'
                                  : 'bg-sky-50 text-sky-700'
                              )}
                            >
                              {tipoInfo.label}
                            </span>
                          ) : (
                            <span className="text-xs text-zinc-400">—</span>
                          )}
                        </td>

                        <td className="px-5 py-3 text-xs text-zinc-600">
                          {!a.estaVinculado ? (
                            <span className="text-zinc-400">Sin datos académicos</span>
                          ) : tipoInfo.isInterno ? (
                            <div className="flex flex-col">
                              <span className="font-mono font-medium text-zinc-800">
                                Mat. {a.matricula || '—'} · Sem. {a.semestre ?? '—'}
                              </span>
                              <span className="line-clamp-1 text-[11px] text-zinc-500">
                                {carreraNombre || 'Sin carrera'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-zinc-500">
                              Comunidad externa (sin matrícula ITQ)
                            </span>
                          )}
                        </td>

                        <td className="whitespace-nowrap px-5 py-3 text-xs text-zinc-600">
                          {a.telefono ? (
                            <span className="inline-flex items-center gap-1.5 font-mono">
                              <Phone className="size-3 text-zinc-400" />
                              {a.telefono}
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
                              setModalAlumno(a)
                            }}
                            className={cn(
                              'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors',
                              a.estaVinculado
                                ? 'border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 hover:text-indigo-600'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700'
                            )}
                          >
                            {a.estaVinculado ? (
                              <>
                                <Pencil className="size-3.5" />
                                Actualizar
                              </>
                            ) : (
                              <>
                                <Link2 className="size-3.5" />
                                Vincular perfil
                              </>
                            )}
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
                <span className="font-medium text-zinc-900">{alumnos.length}</span> cuentas estudiantiles
              </p>
            </div>
          </>
        )}
      </section>

      {/* MODAL DE VINCULACIÓN / ALTA DE ALUMNO (CLE-61) */}
      {modalAlumno && (
        <VincularAlumnoModal
          alumno={modalAlumno}
          cuentasDisponibles={cuentasSinVincular}
          carreras={carreras}
          onClose={() => setModalAlumno(null)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  )
}

function VincularAlumnoModal({
  alumno,
  cuentasDisponibles,
  carreras,
  onClose,
  onSuccess,
}) {
  const esNuevaVinculacion = !alumno.alumno_id

  const [usuarioId, setUsuarioId] = useState(
    alumno.usuario_id ? String(alumno.usuario_id) : ''
  )
  const [tipoAlumnoId, setTipoAlumnoId] = useState(
    Number(alumno.tipo_alumno_id) === 2 ? 2 : 1
  )
  const [nombre, setNombre] = useState(alumno.nombre || '')
  const [apellidoPaterno, setApellidoPaterno] = useState(alumno.apellido_paterno || '')
  const [apellidoMaterno, setApellidoMaterno] = useState(alumno.apellido_materno || '')
  const [telefono, setTelefono] = useState(alumno.telefono || '')

  // Campos exclusivos para Alumno Interno (tipo_alumno_id === 1)
  const [matricula, setMatricula] = useState(alumno.matricula || '')
  const [carreraId, setCarreraId] = useState(
    alumno.carrera_id ? String(alumno.carrera_id) : String(carreras[0]?.carrera_id ?? 1)
  )
  const [semestre, setSemestre] = useState(
    alumno.semestre ? String(alumno.semestre) : '1'
  )

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const esInterno = Number(tipoAlumnoId) === 1

  const cuentaSeleccionada = useMemo(
    () =>
      cuentasDisponibles.find((c) => Number(c.usuario_id) === Number(usuarioId)) ||
      alumno,
    [cuentasDisponibles, usuarioId, alumno]
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const uIdNum = Number(usuarioId)
    const nombreLimpio = nombre.trim()
    const paternoLimpio = apellidoPaterno.trim()
    const maternoLimpio = apellidoMaterno.trim()
    const telefonoLimpio = telefono.trim()
    const matriculaLimpia = matricula.trim()
    const carreraNum = Number(carreraId)
    const semestreNum = Number(semestre)

    if (!uIdNum || uIdNum < 1) {
      setError('Selecciona o ingresa un ID de usuario válido con rol Alumno.')
      return
    }
    if (!nombreLimpio) {
      setError('El nombre del alumno es obligatorio.')
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

    if (esInterno) {
      if (!matriculaLimpia) {
        setError('La matrícula es obligatoria para alumnos internos.')
        return
      }
      if (!carreraNum || carreraNum < 1) {
        setError('Selecciona una carrera válida para alumnos internos.')
        return
      }
      if (!semestreNum || semestreNum < 1 || semestreNum > 20) {
        setError('El semestre debe estar entre 1 y 20.')
        return
      }
    }

    setSubmitting(true)
    try {
      // Regla estricta de DatosAlumno en academico.yaml:
      // Interno (1): matricula, carrera_id y semestre obligatorios.
      // Externo (2): matricula, carrera_id y semestre en null.
      const datosBase = {
        tipo_alumno_id: Number(tipoAlumnoId),
        nombre: nombreLimpio,
        apellido_paterno: paternoLimpio,
        apellido_materno: maternoLimpio || null,
        telefono: telefonoLimpio || null,
        matricula: esInterno ? matriculaLimpia : null,
        carrera_id: esInterno ? carreraNum : null,
        semestre: esInterno ? semestreNum : null,
      }

      if (esNuevaVinculacion) {
        const res = await api.post('/api/v1/alumnos', {
          usuario_id: uIdNum,
          ...datosBase,
        })
        const creado = res.data?.alumno || res.data || {}
        onSuccess(
          {
            ...cuentaSeleccionada,
            ...creado,
            usuario_id: uIdNum,
            ...datosBase,
          },
          true
        )
      } else {
        const res = await api.patch(
          `/api/v1/alumnos/${alumno.alumno_id}`,
          datosBase
        )
        const actualizado = res.data?.alumno || res.data || {}
        onSuccess(
          {
            ...alumno,
            ...actualizado,
            ...datosBase,
          },
          false
        )
      }
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
          : 'No se pudo guardar la vinculación del alumno.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 p-4 backdrop-blur-[1px]">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-200 bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-zinc-200 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">
              {esNuevaVinculacion
                ? 'Vincular Cuenta a Perfil de Alumno'
                : `Actualizar Alumno #${alumno.alumno_id}`}
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              {cuentaSeleccionada?.correo
                ? `Cuenta asociada: ${cuentaSeleccionada.correo} (Usuario #${usuarioId})`
                : 'Asocia una cuenta de usuario (rol_id: 3) con su perfil escolar.'}
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
            {/* Selección de cuenta de usuario (solo al crear/vincular) */}
            {esNuevaVinculacion && (
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="alumno-usuario"
                  className="text-xs font-medium text-zinc-700"
                >
                  Cuenta de Usuario (rol Alumno) <span className="text-rose-500">*</span>
                </label>
                {cuentasDisponibles.length > 0 ? (
                  <select
                    id="alumno-usuario"
                    value={usuarioId}
                    onChange={(e) => setUsuarioId(e.target.value)}
                    className="flex h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    required
                  >
                    <option value="">Selecciona una cuenta pendiente…</option>
                    {cuentasDisponibles.map((c) => (
                      <option key={c.usuario_id} value={c.usuario_id}>
                        Usuario #{c.usuario_id} · {c.correo}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id="alumno-usuario"
                    type="number"
                    min={1}
                    placeholder="ID de usuario (ej. 19)"
                    value={usuarioId}
                    onChange={(e) => setUsuarioId(e.target.value)}
                    className="flex h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 font-mono text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    required
                  />
                )}
              </div>
            )}

            {/* Selector reactivo Tipo de Alumno: Interno (1) vs Externo (2) */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-zinc-700">
                Tipo de alumno <span className="text-rose-500">*</span>
              </span>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  {
                    id: 1,
                    titulo: 'Interno',
                    desc: 'Requiere matrícula, carrera y semestre',
                  },
                  {
                    id: 2,
                    titulo: 'Externo',
                    desc: 'Sin matrícula ni carrera institucional',
                  },
                ].map((opcion) => {
                  const selected = Number(tipoAlumnoId) === opcion.id
                  return (
                    <button
                      key={opcion.id}
                      type="button"
                      onClick={() => setTipoAlumnoId(opcion.id)}
                      className={cn(
                        'flex flex-col items-start rounded-xl border p-3 text-left transition-all',
                        selected
                          ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600'
                          : 'border-zinc-200 bg-white hover:bg-zinc-50'
                      )}
                    >
                      <div className="flex w-full items-center justify-between">
                        <span className="text-xs font-semibold text-zinc-900">
                          {opcion.titulo}
                        </span>
                        <span className="font-mono text-[10px] text-zinc-400">
                          tipo_alumno_id: {opcion.id}
                        </span>
                      </div>
                      <span className="mt-1 text-[11px] leading-snug text-zinc-500">
                        {opcion.desc}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Nombre completo */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="alumno-nombre" className="text-xs font-medium text-zinc-700">
                Nombre(s) <span className="text-rose-500">*</span>
              </label>
              <input
                id="alumno-nombre"
                type="text"
                placeholder="Ej. Fernanda Michelle"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="alumno-paterno" className="text-xs font-medium text-zinc-700">
                  Apellido paterno <span className="text-rose-500">*</span>
                </label>
                <input
                  id="alumno-paterno"
                  type="text"
                  placeholder="Ej. Ruiz"
                  value={apellidoPaterno}
                  onChange={(e) => setApellidoPaterno(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="alumno-materno" className="text-xs font-medium text-zinc-700">
                  Apellido materno <span className="font-normal text-zinc-400">(opcional)</span>
                </label>
                <input
                  id="alumno-materno"
                  type="text"
                  placeholder="Ej. Avilés"
                  value={apellidoMaterno}
                  onChange={(e) => setApellidoMaterno(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            {/* Campos condicionales: solo visibles/activos cuando tipo_alumno_id === 1 (Interno) */}
            {esInterno && (
              <div className="space-y-3 rounded-xl border border-indigo-100 bg-indigo-50/30 p-3.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-700">
                  Datos Institucionales (Alumno Interno)
                </p>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="alumno-matricula"
                      className="text-xs font-medium text-zinc-700"
                    >
                      Matrícula <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="alumno-matricula"
                      type="text"
                      maxLength={50}
                      placeholder="Ej. 22140787"
                      value={matricula}
                      onChange={(e) => setMatricula(e.target.value)}
                      className="flex h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 font-mono text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="alumno-semestre"
                      className="text-xs font-medium text-zinc-700"
                    >
                      Semestre (1–20) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="alumno-semestre"
                      type="number"
                      min={1}
                      max={20}
                      value={semestre}
                      onChange={(e) => setSemestre(e.target.value)}
                      className="flex h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 font-mono text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="alumno-carrera"
                    className="text-xs font-medium text-zinc-700"
                  >
                    Carrera <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="alumno-carrera"
                    value={carreraId}
                    onChange={(e) => setCarreraId(e.target.value)}
                    className="flex h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    required
                  >
                    {carreras.map((c) => (
                      <option key={c.carrera_id} value={c.carrera_id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Teléfono */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="alumno-tel" className="text-xs font-medium text-zinc-700">
                Teléfono (10 dígitos){' '}
                <span className="font-normal text-zinc-400">(opcional)</span>
              </label>
              <input
                id="alumno-tel"
                type="tel"
                maxLength={10}
                placeholder="4421234567"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ''))}
                className="flex h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 font-mono text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
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
              {esNuevaVinculacion ? 'Vincular Alumno' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Alumnos