import { useState } from 'react'
import { Award, CalendarDays, CheckCircle2, MapPin, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { WeeklySchedule, formatDays, formatRange, slotsOverlap } from '@/components/WeeklySchedule'

const LANGUAGES = ['Inglés', 'Francés', 'Alemán', 'Italiano', 'Japonés']

const INITIAL_GROUPS = [
  {
    id: 'g1',
    code: 'ALE-A1-002',
    language: 'Alemán',
    level: 'A1',
    teacherName: 'Klaus Weber',
    roomCode: 'N-008',
    campus: 'Norte',
    days: [5], // Sáb
    start: 540, // 09:00
    end: 780, // 13:00
    enrolled: 22,
    capacity: 25,
  },
  {
    id: 'g2',
    code: 'ING-B2-014',
    language: 'Inglés',
    level: 'B2',
    teacherName: 'Ana López',
    roomCode: 'A-204',
    campus: 'Centro',
    days: [0, 2, 4], // Lun, Mié, Vie
    start: 420, // 07:00
    end: 510, // 08:30
    enrolled: 30,
    capacity: 30,
  },
  {
    id: 'g3',
    code: 'ING-B2-019',
    language: 'Inglés',
    level: 'B2',
    teacherName: 'Jorge Martínez',
    roomCode: 'A-112',
    campus: 'Centro',
    days: [1, 3], // Mar, Jue
    start: 960, // 16:00
    end: 1080, // 18:00
    enrolled: 19,
    capacity: 30,
  },
  {
    id: 'g4',
    code: 'FRA-A1-003',
    language: 'Francés',
    level: 'A1',
    teacherName: 'Claire Dubois',
    roomCode: 'B-101',
    campus: 'Norte',
    days: [5], // Sáb (Traslape intencional con Alemán A1 para probar bloqueo)
    start: 600, // 10:00
    end: 840, // 14:00
    enrolled: 24,
    capacity: 30,
  },
  {
    id: 'g5',
    code: 'JAP-A1-001',
    language: 'Japonés',
    level: 'A1',
    teacherName: 'Kenji Sato',
    roomCode: 'B-215',
    campus: 'Norte',
    days: [1, 3], // Mar, Jue
    start: 1140, // 19:00
    end: 1260, // 21:00
    enrolled: 18,
    capacity: 20,
  },
]

const ACCREDITED_LEVELS = [
  { language: 'Inglés', level: 'A1', period: '2025-A', grade: 9.4 },
  { language: 'Inglés', level: 'A2', period: '2025-B', grade: 8.8 },
  { language: 'Inglés', level: 'B1 (parcial)', period: '2026-A', grade: 9.1 },
]

export function MiTablero() {
  const user = JSON.parse(localStorage.getItem('cle_user') || '{}')
  const firstName = (user.nombre || 'Alumno').split(' ')[0]
  const identifier = user.matricula || user.correo || '2023-04871'

  const [groups, setGroups] = useState(INITIAL_GROUPS)
  const [myIds, setMyIds] = useState(['g1'])
  const [language, setLanguage] = useState('Todos')

  const myGroups = groups.filter((g) => myIds.includes(g.id))

  const handleEnroll = (groupId) => {
    setMyIds((prev) => [...prev, groupId])
    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, enrolled: g.enrolled + 1 } : g))
    )
  }

  const handleUnenroll = (groupId) => {
    setMyIds((prev) => prev.filter((id) => id !== groupId))
    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, enrolled: Math.max(0, g.enrolled - 1) } : g))
    )
  }

  const available = groups
    .filter((g) => !myIds.includes(g.id) && (language === 'Todos' || g.language === language))
    .map((g) => {
      const conflict = myGroups.find((m) => slotsOverlap(m, g))
      const full = g.enrolled >= g.capacity
      return { group: g, conflict, full }
    })
    .sort((a, b) => Number(a.full || !!a.conflict) - Number(b.full || !!b.conflict))

  return (
    <div className="space-y-6 p-8">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Hola, {firstName}</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {identifier} · Periodo 2026-B · {myGroups.length}{' '}
          {myGroups.length === 1 ? 'grupo inscrito' : 'grupos inscritos'}
        </p>
      </div>

      {/* Horario y Niveles Acreditados */}
      <div className="grid gap-6 xl:grid-cols-3">
        <section
          aria-labelledby="my-schedule"
          className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm xl:col-span-2"
        >
          <div className="flex items-center gap-3 border-b border-zinc-200 px-5 py-4">
            <CalendarDays className="size-4 text-zinc-400" aria-hidden="true" />
            <h2 id="my-schedule" className="text-sm font-semibold text-zinc-900">
              Mi horario asignado
            </h2>
          </div>

          <div className="p-4 sm:p-5">
            <WeeklySchedule groups={myGroups} />
          </div>

          {myGroups.length > 0 && (
            <ul className="divide-y divide-zinc-100 border-t border-zinc-200">
              {myGroups.map((g) => (
                <li key={g.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm">
                  <span className="font-mono text-xs font-medium text-zinc-900">{g.code}</span>
                  <span className="text-zinc-700">
                    {g.language} {g.level}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {formatDays(g.days)} · {formatRange(g.start, g.end)} · {g.roomCode} (Campus {g.campus})
                  </span>
                  <button
                    type="button"
                    onClick={() => handleUnenroll(g.id)}
                    className="ml-auto inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-zinc-500 transition-colors hover:bg-rose-50 hover:text-rose-600"
                  >
                    <X className="size-3.5" aria-hidden="true" />
                    Darme de baja
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Niveles acreditados */}
        <section
          aria-labelledby="levels"
          className="flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm"
        >
          <div>
            <div className="flex items-center gap-3 border-b border-zinc-200 px-5 py-4">
              <Award className="size-4 text-zinc-400" aria-hidden="true" />
              <h2 id="levels" className="text-sm font-semibold text-zinc-900">
                Niveles acreditados
              </h2>
            </div>
            <ol className="flex flex-col gap-3 p-5">
              {ACCREDITED_LEVELS.map((l) => (
                <li key={`${l.language}-${l.level}`} className="flex items-center gap-3">
                  <CheckCircle2 className="size-5 shrink-0 text-emerald-500" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-900">
                      {l.language} {l.level}
                    </p>
                    <p className="text-xs text-zinc-500">Periodo {l.period}</p>
                  </div>
                  <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-zinc-700">
                    {l.grade.toFixed(1)}
                  </span>
                </li>
              ))}
            </ol>
          </div>
          <div className="mx-5 mb-5 rounded-lg bg-indigo-50 px-3 py-2.5 text-xs text-indigo-800">
            Siguiente nivel sugerido: <span className="font-semibold">Inglés B2</span>
          </div>
        </section>
      </div>

      {/* Grupos disponibles para inscripción */}
      <section
        aria-labelledby="available"
        className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4">
          <div>
            <h2 id="available" className="text-sm font-semibold text-zinc-900">
              Grupos disponibles para inscripción
            </h2>
            <p className="text-xs text-zinc-500">
              Los grupos con traslape de horario o sin cupo no pueden seleccionarse
            </p>
          </div>
          <select
            id="available-language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="Todos">Todos los idiomas</option>
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>

        <ul className="grid gap-px bg-zinc-100 sm:grid-cols-2 xl:grid-cols-3">
          {available.map(({ group: g, conflict, full }) => {
            const blocked = full || !!conflict
            const pct = Math.round((g.enrolled / g.capacity) * 100)

            return (
              <li key={g.id} className="flex flex-col gap-3 bg-white p-5">
                <div>
                  <p className="font-mono text-xs text-zinc-500">{g.code}</p>
                  <p className="mt-0.5 text-sm font-semibold text-zinc-900">
                    {g.language} {g.level}
                  </p>
                  <p className="text-xs text-zinc-500">{g.teacherName}</p>
                </div>

                <div className="flex flex-col gap-1 text-xs text-zinc-600">
                  <p className="flex items-center gap-1.5">
                    <CalendarDays className="size-3.5 text-zinc-400" aria-hidden="true" />
                    {formatDays(g.days)} · <span className="tabular-nums">{formatRange(g.start, g.end)}</span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <MapPin className="size-3.5 text-zinc-400" aria-hidden="true" />
                    {g.roomCode} · Campus {g.campus}
                  </p>
                </div>

                {/* Barra de cupo */}
                <div className="flex items-center gap-2.5">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100">
                    <div
                      className={cn('h-full rounded-full', full ? 'bg-red-500' : 'bg-indigo-600')}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="font-mono text-xs text-zinc-600">
                    {g.enrolled}/{g.capacity}
                  </span>
                </div>

                <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                  <p className={cn('text-xs font-medium', blocked ? 'text-red-600' : 'text-emerald-700')}>
                    {full
                      ? 'Sin cupo'
                      : conflict
                      ? `Traslape con ${conflict.code}`
                      : `${g.capacity - g.enrolled} lugares`}
                  </p>
                  <button
                    type="button"
                    disabled={blocked}
                    onClick={() => handleEnroll(g.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-2xs transition-colors hover:bg-indigo-700 disabled:pointer-events-none disabled:opacity-40"
                  >
                    <Plus className="size-3.5" aria-hidden="true" />
                    Inscribirme
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}

export default MiTablero