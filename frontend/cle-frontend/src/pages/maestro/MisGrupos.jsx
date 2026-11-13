import { CalendarDays, MapPin } from 'lucide-react'
import { formatDays, formatRange } from '@/components/WeeklySchedule'

export const TEACHER_GROUPS = [
  {
    id: 'tg1',
    code: 'ING-B2-014',
    language: 'Inglés',
    level: 'B2',
    roomCode: 'A-204',
    campus: 'Centro',
    days: [0, 2, 4], // Lun, Mié, Vie
    start: 420, // 07:00
    end: 510, // 08:30
    enrolled: 30,
    capacity: 30,
  },
  {
    id: 'tg2',
    code: 'ING-A1-030',
    language: 'Inglés',
    level: 'A1',
    roomCode: 'A-112',
    campus: 'Centro',
    days: [1, 3], // Mar, Jue
    start: 540, // 09:00
    end: 660, // 11:00
    enrolled: 14,
    capacity: 30,
  },
  {
    id: 'tg3',
    code: 'ING-C1-002',
    language: 'Inglés',
    level: 'C1',
    roomCode: 'B-215',
    campus: 'Norte',
    days: [5], // Sáb
    start: 540, // 09:00
    end: 720, // 12:00
    enrolled: 9,
    capacity: 20,
  },
]

export function MisGrupos() {
  const totalStudents = TEACHER_GROUPS.reduce((s, g) => s + g.enrolled, 0)

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Mis Grupos</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {TEACHER_GROUPS.length} grupos asignados · {totalStudents} alumnos en el periodo 2026-B
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {TEACHER_GROUPS.map((g) => {
          const pct = Math.round((g.enrolled / g.capacity) * 100)
          const isFull = g.enrolled >= g.capacity

          return (
            <article
              key={g.id}
              className="flex flex-col gap-4 rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-xs font-medium text-zinc-500">{g.code}</p>
                  <h2 className="mt-1 text-base font-semibold text-zinc-900">
                    {g.language} {g.level}
                  </h2>
                </div>
                <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-700">
                  {g.level}
                </span>
              </div>

              <dl className="flex flex-col gap-2 text-sm">
                <div className="flex items-center gap-2 text-zinc-600">
                  <CalendarDays className="size-4 text-zinc-400" aria-hidden="true" />
                  <dd>
                    {formatDays(g.days)} · <span className="tabular-nums">{formatRange(g.start, g.end)}</span>
                  </dd>
                </div>
                <div className="flex items-center gap-2 text-zinc-600">
                  <MapPin className="size-4 text-zinc-400" aria-hidden="true" />
                  <dd>
                    {g.roomCode} · Campus {g.campus}
                  </dd>
                </div>
              </dl>

              <div className="mt-auto flex items-center gap-3 pt-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className={`h-full rounded-full ${isFull ? 'bg-red-500' : 'bg-emerald-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="font-mono text-xs font-semibold text-zinc-700">
                  {g.enrolled}/{g.capacity}
                </span>
                <span className={`text-xs font-medium ${isFull ? 'text-red-600' : 'text-zinc-500'}`}>
                  {isFull ? 'Lleno' : 'Disponible'}
                </span>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}

export default MisGrupos