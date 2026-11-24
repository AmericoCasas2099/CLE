import { useState, useEffect } from 'react'
import {
  Building2,
  DoorOpen,
  Plus,
  Pencil,
  Power,
  UsersRound,
  Search,
  MapPin,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import api from '@/services/api'

const MAX_ROOM_CAPACITY = 60

function extractApiError(err, fallback) {
  const data = err.response?.data
  const apiError = data?.error
  if (Array.isArray(apiError?.detalles) && apiError.detalles.length > 0) {
    return apiError.detalles.map((d) => d.mensaje).join(' · ')
  }
  if (Array.isArray(data?.detalles) && data.detalles.length > 0) {
    return data.detalles.map((d) => d.mensaje).join(' · ')
  }
  const msg = apiError?.mensaje || data?.mensaje || data?.detail
  return typeof msg === 'string' ? msg : fallback
}

export function Infraestructura({ initialCampusId = 'Todos' }) {
  const [campuses, setCampuses] = useState([])
  const [salones, setSalones] = useState([])
  const [selectedCampusId, setSelectedCampusId] = useState(initialCampusId)
  const [search, setSearch] = useState('')

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [bannerMessage, setBannerMessage] = useState('')

  // Modales independientes (CLE-184, CLE-185 y CLE-186)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingSalon, setEditingSalon] = useState(null)
  const [statusTargetSalon, setStatusTargetSalon] = useState(null)

  const consultarInfraestructura = async () => {
    setLoading(true)
    setLoadError('')
    try {
      const [resCampus, resSalones] = await Promise.all([
        api.get('/api/v1/campus', {
          params: { pagina: 1, limite: 50 },
          skipAuthRedirect: true,
        }),
        api.get('/api/v1/salones', {
          params: { pagina: 1, limite: 100 },
          skipAuthRedirect: true,
        }),
      ])

      const listaCampus = Array.isArray(resCampus.data?.campus) ? resCampus.data.campus : []
      const listaSalones = Array.isArray(resSalones.data?.salones) ? resSalones.data.salones : []

      setCampuses(listaCampus)
      setSalones(listaSalones)
    } catch (err) {
      const status = err.response?.status
      if (status === 401 || status === 403) {
        setLoadError('No tienes permisos o tu sesión expiró para consultar la infraestructura.')
      } else {
        setLoadError(
          extractApiError(err, 'No se pudo obtener la información de campus y salones.')
        )
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    consultarInfraestructura()
  }, [])

  // Resumen por campus con salones asociados (CLE-182 · CA-01)
  const campusCards = campuses.map((c) => {
    const asociados = salones.filter((s) => Number(s.campus_id) === Number(c.campus_id))
    const activos = asociados.filter((s) => s.estatus === 'Activo')
    const lugaresActivos = activos.reduce((acc, s) => acc + Number(s.capacidad || 0), 0)

    return {
      ...c,
      totalSalones: asociados.length,
      salonesActivos: activos.length,
      lugaresActivos,
    }
  })

  // Filtrado de salones por campus y búsqueda (CLE-183 · CA-02)
  const salonesVisibles = salones.filter((s) => {
    const matchesCampus =
      selectedCampusId === 'Todos' || Number(s.campus_id) === Number(selectedCampusId)

    const q = search.trim().toLowerCase()
    if (!q) return matchesCampus

    const nombre = (s.nombre || '').toLowerCase()
    const campusNombre = (s.campus_nombre || '').toLowerCase()
    const idStr = String(s.salon_id || '')
    return matchesCampus && (nombre.includes(q) || campusNombre.includes(q) || idStr.includes(q))
  })

  const handleSalonSaved = (salonGuardado, isEdit) => {
    const campusObj = campuses.find(
      (c) => Number(c.campus_id) === Number(salonGuardado.campus_id)
    )
    const enriquecido = {
      ...salonGuardado,
      campus_nombre: salonGuardado.campus_nombre || campusObj?.nombre || '—',
      campus_estatus: salonGuardado.campus_estatus || campusObj?.estatus || 'Activo',
    }

    if (isEdit) {
      setSalones((prev) =>
        prev.map((s) => (s.salon_id === enriquecido.salon_id ? enriquecido : s))
      )
      setEditingSalon(null)
      setBannerMessage(
        `Salón ${enriquecido.nombre} (Campus ${enriquecido.campus_nombre}) actualizado correctamente.`
      )
    } else {
      setSalones((prev) => [...prev, enriquecido])
      setIsCreateOpen(false)
      setSelectedCampusId(String(enriquecido.campus_id))
      setBannerMessage(
        `Salón ${enriquecido.nombre} registrado en Campus ${enriquecido.campus_nombre}.`
      )
    }
    consultarInfraestructura()
  }

  const handleEstatusChanged = (salonActualizado) => {
    setSalones((prev) =>
      prev.map((s) =>
        s.salon_id === salonActualizado.salon_id
          ? { ...s, estatus: salonActualizado.estatus }
          : s
      )
    )
    setStatusTargetSalon(null)
    setBannerMessage(
      `El salón ${salonActualizado.nombre} (Campus ${salonActualizado.campus_nombre}) pasó a estatus ${salonActualizado.estatus}.`
    )
    consultarInfraestructura()
  }

  return (
    <div className="space-y-6 p-8">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Infraestructura
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Consulta los campus disponibles ({campuses.length}) y administra sus salones asignados ({salones.length}).
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={consultarInfraestructura}
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
              setIsCreateOpen(true)
            }}
            disabled={campuses.length === 0}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white shadow-xs transition-colors hover:bg-indigo-700 disabled:opacity-50"
          >
            <Plus className="size-4" />
            Nuevo Salón
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

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-zinc-200/80 bg-white py-16 text-sm text-zinc-500 shadow-sm">
          <Loader2 className="size-4 animate-spin text-indigo-600" />
          Consultando campus y salones en el servidor…
        </div>
      ) : loadError ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-zinc-200/80 bg-white px-6 py-14 text-center shadow-sm">
          <div className="flex size-10 items-center justify-center rounded-full bg-rose-50 text-rose-600">
            <AlertCircle className="size-5" />
          </div>
          <p className="max-w-md text-sm font-medium text-rose-700">{loadError}</p>
          <button
            type="button"
            onClick={consultarInfraestructura}
            className="rounded-lg border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Reintentar consulta
          </button>
        </div>
      ) : (
        <>
          {/* TARJETAS DE CAMPUS DISPONIBLES (CLE-182 · CA-01) */}
          <div className="grid gap-4 sm:grid-cols-2">
            {campusCards.map((c) => {
              const isSelected = String(selectedCampusId) === String(c.campus_id)
              const campusActivo = c.estatus === 'Activo'

              return (
                <button
                  key={c.campus_id}
                  type="button"
                  onClick={() =>
                    setSelectedCampusId(isSelected ? 'Todos' : String(c.campus_id))
                  }
                  aria-pressed={isSelected}
                  className={cn(
                    'flex items-start gap-4 rounded-2xl border border-zinc-200/80 bg-white p-5 text-left shadow-sm transition-all hover:border-zinc-300',
                    isSelected && 'border-indigo-400 ring-3 ring-indigo-500/10'
                  )}
                >
                  <div
                    className={cn(
                      'flex size-10 shrink-0 items-center justify-center rounded-lg ring-1',
                      isSelected
                        ? 'bg-indigo-50 text-indigo-600 ring-indigo-200'
                        : 'bg-zinc-50 text-zinc-500 ring-zinc-200'
                    )}
                  >
                    <Building2 className="size-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-zinc-900">
                        Campus {c.nombre}{' '}
                        <span className="font-mono text-xs font-normal text-zinc-400">
                          #{c.campus_id}
                        </span>
                      </p>
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset',
                          campusActivo
                            ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                            : 'bg-zinc-100 text-zinc-600 ring-zinc-500/20'
                        )}
                      >
                        {c.estatus}
                      </span>
                    </div>

                    <p className="mt-1 text-xs font-medium text-zinc-700">
                      {c.salonesActivos} de {c.totalSalones} salones activos · {c.lugaresActivos}{' '}
                      lugares disponibles
                    </p>

                    {c.ubicacion && (
                      <p className="mt-1.5 flex items-start gap-1.5 text-xs text-zinc-500">
                        <MapPin className="mt-0.5 size-3.5 shrink-0 text-zinc-400" />
                        <span className="line-clamp-2">{c.ubicacion}</span>
                      </p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* LISTADO DE SALONES (CLE-183 · CA-02 y CA-05) */}
          <section className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900">Salones</h2>
                <p className="text-xs text-zinc-500">
                  {salonesVisibles.length} {salonesVisibles.length === 1 ? 'registro' : 'registros'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative w-full sm:w-56">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="search"
                    placeholder="Buscar salón, campus o ID…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="flex h-9 w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div className="inline-flex flex-wrap rounded-lg border border-zinc-200 bg-zinc-50 p-1">
                  <button
                    type="button"
                    onClick={() => setSelectedCampusId('Todos')}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors',
                      selectedCampusId === 'Todos'
                        ? 'bg-white text-zinc-900 shadow-2xs'
                        : 'text-zinc-600 hover:text-zinc-900'
                    )}
                  >
                    <span>Todos</span>
                    <span className="text-[11px] text-zinc-400">{salones.length}</span>
                  </button>

                  {campusCards.map((c) => (
                    <button
                      key={c.campus_id}
                      type="button"
                      onClick={() => setSelectedCampusId(String(c.campus_id))}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors',
                        String(selectedCampusId) === String(c.campus_id)
                          ? 'bg-white text-zinc-900 shadow-2xs'
                          : 'text-zinc-600 hover:text-zinc-900'
                      )}
                    >
                      <span>Campus {c.nombre}</span>
                      <span className="text-[11px] text-zinc-400">{c.totalSalones}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {salonesVisibles.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <div className="flex size-11 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500">
                  <DoorOpen className="size-5" />
                </div>
                <h3 className="mt-3 text-sm font-semibold text-zinc-900">
                  Sin salones registrados
                </h3>
                <p className="mt-1 max-w-sm text-xs text-zinc-500">
                  No existen registros de salones que coincidan con el campus o filtro seleccionado.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50/60 text-left text-xs text-zinc-500">
                      <th className="px-5 py-2.5 font-medium">ID</th>
                      <th className="px-5 py-2.5 font-medium">Salón</th>
                      <th className="px-5 py-2.5 font-medium">Campus</th>
                      <th className="w-60 px-5 py-2.5 font-medium">Capacidad</th>
                      <th className="px-5 py-2.5 font-medium">Estatus</th>
                      <th className="px-5 py-2.5 text-right font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {salonesVisibles.map((salon) => {
                      const isActivo = salon.estatus === 'Activo'
                      const campusNombre =
                        salon.campus_nombre ||
                        campuses.find((c) => Number(c.campus_id) === Number(salon.campus_id))
                          ?.nombre ||
                        '—'

                      return (
                        <tr
                          key={salon.salon_id}
                          className={cn(
                            'transition-colors hover:bg-zinc-50/70',
                            !isActivo && 'bg-zinc-50/50 opacity-80'
                          )}
                        >
                          <td className="whitespace-nowrap px-5 py-3 font-mono text-xs font-medium text-zinc-500">
                            #{salon.salon_id}
                          </td>

                          <td className="whitespace-nowrap px-5 py-3">
                            <span className="font-mono text-xs font-semibold text-zinc-900">
                              {salon.nombre}
                            </span>
                          </td>

                          <td className="whitespace-nowrap px-5 py-3">
                            <span className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
                              Campus {campusNombre}
                            </span>
                          </td>

                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <UsersRound className="size-3.5 shrink-0 text-zinc-400" />
                              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100">
                                <div
                                  className={cn(
                                    'h-full rounded-full',
                                    isActivo ? 'bg-indigo-500' : 'bg-zinc-400'
                                  )}
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      (Number(salon.capacidad || 0) / MAX_ROOM_CAPACITY) * 100
                                    )}%`,
                                  }}
                                />
                              </div>
                              <span className="w-20 text-xs tabular-nums text-zinc-700">
                                {salon.capacidad} lugares
                              </span>
                            </div>
                          </td>

                          <td className="whitespace-nowrap px-5 py-3">
                            <span
                              className={cn(
                                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
                                isActivo
                                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                                  : 'bg-rose-50 text-rose-700 ring-rose-600/20'
                              )}
                            >
                              <span
                                className={cn(
                                  'size-1.5 rounded-full',
                                  isActivo ? 'bg-emerald-500' : 'bg-rose-500'
                                )}
                              />
                              {salon.estatus}
                            </span>
                          </td>

                          <td className="whitespace-nowrap px-5 py-3 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setBannerMessage('')
                                  setEditingSalon(salon)
                                }}
                                className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 hover:text-indigo-600"
                              >
                                <Pencil className="size-3.5" />
                                Editar
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setBannerMessage('')
                                  setStatusTargetSalon({
                                    ...salon,
                                    campus_nombre: campusNombre,
                                  })
                                }}
                                className={cn(
                                  'inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors',
                                  isActivo
                                    ? 'border-zinc-200 bg-white text-zinc-700 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700'
                                    : 'border-emerald-200 bg-emerald-50/60 text-emerald-700 hover:bg-emerald-100'
                                )}
                              >
                                <Power className="size-3.5" />
                                {isActivo ? 'Inhabilitar' : 'Activar'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {/* MODAL REGISTRO DE SALÓN (CLE-184 · CA-03) */}
      {isCreateOpen && (
        <SalonFormModal
          campuses={campuses}
          salones={salones}
          defaultCampusId={
            selectedCampusId !== 'Todos'
              ? Number(selectedCampusId)
              : Number(campuses[0]?.campus_id || 1)
          }
          onClose={() => setIsCreateOpen(false)}
          onSuccess={(nuevo) => handleSalonSaved(nuevo, false)}
        />
      )}

      {/* MODAL MODIFICACIÓN DE SALÓN (CLE-185 · CA-03) */}
      {editingSalon && (
        <SalonFormModal
          campuses={campuses}
          salones={salones}
          initialSalon={editingSalon}
          onClose={() => setEditingSalon(null)}
          onSuccess={(actualizado) => handleSalonSaved(actualizado, true)}
        />
      )}

      {/* MODAL CONFIRMAR INHABILITACIÓN / ACTIVACIÓN (CLE-186 · CA-04) */}
      {statusTargetSalon && (
        <ConfirmarEstatusSalonModal
          salon={statusTargetSalon}
          onClose={() => setStatusTargetSalon(null)}
          onSuccess={handleEstatusChanged}
        />
      )}
    </div>
  )
}

function SalonFormModal({
  campuses,
  salones,
  initialSalon = null,
  defaultCampusId = 1,
  onClose,
  onSuccess,
}) {
  const isEdit = Boolean(initialSalon)
  const [nombre, setNombre] = useState(initialSalon?.nombre || '')
  const [campusId, setCampusId] = useState(
    Number(initialSalon?.campus_id ?? defaultCampusId)
  )
  const [capacidad, setCapacidad] = useState(String(initialSalon?.capacidad ?? 30))
  const [fieldErrors, setFieldErrors] = useState({})
  const [apiError, setApiError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setApiError('')

    const nextErrors = {}
    const nombreLimpio = nombre.trim().toUpperCase()
    const campusNum = Number(campusId)
    const capacidadNum = Number(capacidad)

    if (!nombreLimpio) {
      nextErrors.nombre = 'El nombre o clave del salón es obligatorio.'
    } else if (nombreLimpio.length > 30) {
      nextErrors.nombre = 'Máximo 30 caracteres.'
    } else if (
      salones.some(
        (s) =>
          (s.nombre || '').trim().toUpperCase() === nombreLimpio &&
          Number(s.campus_id) === campusNum &&
          s.salon_id !== initialSalon?.salon_id
      )
    ) {
      nextErrors.nombre = 'Ya existe un salón con ese nombre en el campus seleccionado.'
    }

    if (!campusNum || campusNum < 1) {
      nextErrors.campus_id = 'Selecciona un campus válido.'
    }

    if (!Number.isInteger(capacidadNum) || capacidadNum < 1 || capacidadNum > 150) {
      nextErrors.capacidad = 'Ingresa una capacidad entera entre 1 y 150 lugares.'
    }

    setFieldErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    try {
      if (isEdit) {
        const payload = {}
        if (nombreLimpio !== initialSalon.nombre) payload.nombre = nombreLimpio
        if (campusNum !== Number(initialSalon.campus_id)) payload.campus_id = campusNum
        if (capacidadNum !== Number(initialSalon.capacidad)) payload.capacidad = capacidadNum

        if (Object.keys(payload).length === 0) {
          onClose()
          return
        }

        const res = await api.patch(
          `/api/v1/salones/${initialSalon.salon_id}`,
          payload,
          { skipAuthRedirect: true }
        )
        const updated = res.data?.salon || res.data || {}
        onSuccess({
          ...initialSalon,
          ...payload,
          ...updated,
          salon_id: initialSalon.salon_id,
        })
      } else {
        const payload = {
          campus_id: campusNum,
          nombre: nombreLimpio,
          capacidad: capacidadNum,
        }
        const res = await api.post('/api/v1/salones', payload, {
          skipAuthRedirect: true,
        })
        const created = res.data?.salon || res.data || {}
        onSuccess({
          salon_id: created.salon_id ?? Date.now(),
          campus_id: created.campus_id ?? campusNum,
          nombre: created.nombre ?? nombreLimpio,
          capacidad: created.capacidad ?? capacidadNum,
          estatus: created.estatus ?? 'Activo',
          campus_nombre: created.campus_nombre,
        })
      }
    } catch (err) {
      setApiError(
        extractApiError(
          err,
          isEdit ? 'No se pudo modificar el salón.' : 'No se pudo registrar el salón.'
        )
      )
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
              {isEdit
                ? `Modificar Salón #${initialSalon.salon_id} (${initialSalon.nombre})`
                : 'Registrar Nuevo Salón'}
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Los campos marcados con <span className="font-semibold text-rose-600">*</span> son
              obligatorios.
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
              <label htmlFor="salon-campus" className="text-xs font-medium text-zinc-700">
                Campus <span className="text-rose-600">*</span>
              </label>
              <select
                id="salon-campus"
                value={campusId}
                onChange={(e) => {
                  setCampusId(Number(e.target.value))
                  if (fieldErrors.campus_id) setFieldErrors({ ...fieldErrors, campus_id: '' })
                }}
                className="flex h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {campuses.map((c) => (
                  <option key={c.campus_id} value={c.campus_id}>
                    {c.campus_id} · Campus {c.nombre} ({c.estatus})
                  </option>
                ))}
              </select>
              {fieldErrors.campus_id && (
                <p className="text-xs text-rose-600">{fieldErrors.campus_id}</p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="salon-nombre" className="text-xs font-medium text-zinc-700">
                  Identificación / Nombre <span className="text-rose-600">*</span>
                </label>
                <input
                  id="salon-nombre"
                  autoFocus
                  placeholder="Ej. A-103"
                  value={nombre}
                  onChange={(e) => {
                    setNombre(e.target.value)
                    if (fieldErrors.nombre) setFieldErrors({ ...fieldErrors, nombre: '' })
                  }}
                  className="flex h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 font-mono text-sm uppercase text-zinc-900 placeholder:font-sans placeholder:normal-case placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                {fieldErrors.nombre && (
                  <p className="text-xs text-rose-600">{fieldErrors.nombre}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="salon-capacidad" className="text-xs font-medium text-zinc-700">
                  Capacidad (lugares) <span className="text-rose-600">*</span>
                </label>
                <input
                  id="salon-capacidad"
                  type="number"
                  min={1}
                  max={150}
                  value={capacidad}
                  onChange={(e) => {
                    setCapacidad(e.target.value)
                    if (fieldErrors.capacidad) setFieldErrors({ ...fieldErrors, capacidad: '' })
                  }}
                  className="flex h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm tabular-nums text-zinc-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                {fieldErrors.capacidad && (
                  <p className="text-xs text-rose-600">{fieldErrors.capacidad}</p>
                )}
              </div>
            </div>

            {apiError && (
              <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                <AlertCircle className="size-4 shrink-0" />
                <span>{apiError}</span>
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
              {isEdit ? 'Guardar Cambios' : 'Guardar Salón'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ConfirmarEstatusSalonModal({ salon, onClose, onSuccess }) {
  const isInhabilitar = salon.estatus === 'Activo'
  const nextStatus = isInhabilitar ? 'Inactivo' : 'Activo'
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleConfirm = async () => {
    setSubmitting(true)
    setError('')
    try {
      const res = await api.patch(
        `/api/v1/salones/${salon.salon_id}/estatus`,
        { estatus: nextStatus },
        { skipAuthRedirect: true }
      )
      const updated = res.data?.salon || res.data || {}
      onSuccess({
        ...salon,
        ...updated,
        salon_id: salon.salon_id,
        estatus: updated.estatus ?? nextStatus,
      })
    } catch (err) {
      setError(extractApiError(err, 'No se pudo actualizar el estatus del salón.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 p-4 backdrop-blur-[1px]">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl">
        <div className="flex items-start gap-3.5 px-6 pt-6 pb-4">
          <div
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-full',
              isInhabilitar ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
            )}
          >
            <AlertTriangle className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-zinc-900">
              {isInhabilitar
                ? `¿Inhabilitar salón ${salon.nombre}?`
                : `¿Activar salón ${salon.nombre}?`}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">
              {isInhabilitar ? (
                <>
                  El salón{' '}
                  <span className="font-mono font-semibold text-zinc-800">
                    #{salon.salon_id} · {salon.nombre}
                  </span>{' '}
                  (Campus {salon.campus_nombre}, {salon.capacidad} lugares) quedará{' '}
                  <span className="font-medium text-rose-700">Inactivo</span> y no podrá asignarse a
                  nuevos horarios.
                </>
              ) : (
                <>
                  El salón{' '}
                  <span className="font-mono font-semibold text-zinc-800">
                    #{salon.salon_id} · {salon.nombre}
                  </span>{' '}
                  (Campus {salon.campus_nombre}) volverá a estar{' '}
                  <span className="font-medium text-emerald-700">Activo</span> para programar
                  grupos.
                </>
              )}
            </p>

            {error && (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                <AlertCircle className="size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-zinc-200 bg-zinc-50 px-6 py-3.5">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium text-white transition-colors disabled:opacity-50',
              isInhabilitar
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-emerald-600 hover:bg-emerald-700'
            )}
          >
            {submitting && <Loader2 className="size-3.5 animate-spin" />}
            {isInhabilitar ? 'Confirmar inhabilitación' : 'Confirmar activación'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Infraestructura