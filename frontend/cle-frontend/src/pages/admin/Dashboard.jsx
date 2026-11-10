import { useNavigate } from 'react-router-dom'
import {
  CalendarClock,
  DoorOpen,
  GraduationCap,
  Users,
  Building,
  User,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
} from 'lucide-react'

const KPIS = [
  {
    label: 'Total Alumnos Inscritos',
    value: '220',
    icon: GraduationCap,
    badge: '+8.2%',
    badgeType: 'positive',
    subtext: 'vs. periodo anterior',
  },
  {
    label: 'Grupos Abiertos',
    value: '10',
    icon: Users,
    badge: '11 total',
    badgeType: 'positive',
    subtext: 'con cupo disponible',
  },
  {
    label: 'Ocupación de Salones',
    value: '86%',
    icon: DoorOpen,
    badge: '-2.4%',
    badgeType: 'negative',
    subtext: '6 de 7 salones activos',
  },
  {
    label: 'Docentes Activos',
    value: '6',
    icon: User,
    badge: '+1',
    badgeType: 'positive',
    subtext: '5 idiomas impartidos',
  },
]

const CRITICAL_GROUPS = [
  {
    code: 'ING-B2-014',
    level: 'B2',
    language: 'Inglés',
    room: 'A-204',
    campus: 'Campus Centro',
    days: 'Lun · Mié · Vie',
    time: '07:00 – 08:30',
    enrolled: 30,
    capacity: 30,
    status: 'Lleno',
    color: 'red',
  },
  {
    code: 'FRA-A1-003',
    level: 'A1',
    language: 'Francés',
    room: 'B-101',
    campus: 'Campus Norte',
    days: 'Mar · Jue',
    time: '18:00 – 20:00',
    enrolled: 29,
    capacity: 30,
    status: 'Crítico',
    color: 'orange',
  },
  {
    code: 'ING-A2-021',
    level: 'A2',
    language: 'Inglés',
    room: 'A-112',
    campus: 'Campus Centro',
    days: 'Lun · Mié',
    time: '16:00 – 18:00',
    enrolled: 28,
    capacity: 30,
    status: 'Crítico',
    color: 'orange',
  },
  {
    code: 'JAP-A1-001',
    level: 'A1',
    language: 'Japonés',
    room: 'B-215',
    campus: 'Campus Norte',
    days: 'Mar · Jue',
    time: '19:00 – 21:00',
    enrolled: 18,
    capacity: 20,
    status: 'Crítico',
    color: 'orange',
  },
  {
    code: 'ALE-A1-002',
    level: 'A1',
    language: 'Alemán',
    room: 'N-008',
    campus: 'Campus Norte',
    days: 'Sáb',
    time: '09:00 – 13:00',
    enrolled: 22,
    capacity: 25,
    status: 'Alto',
    color: 'indigo',
  },
  {
    code: 'ITA-B1-004',
    level: 'B1',
    language: 'Italiano',
    room: 'A-301',
    campus: 'Campus Centro',
    days: 'Lun · Mié · Vie',
    time: '12:00 – 13:30',
    enrolled: 22,
    capacity: 25,
    status: 'Alto',
    color: 'indigo',
  },
]

export function Dashboard() {
  const navigate = useNavigate()

  return (
    <div className="space-y-6 p-8">
      {/* Encabezado del Dashboard */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Panel Principal</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Resumen operativo del periodo escolar 2026-B · Actualizado hoy, 09:40
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin/salones')}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 transition-colors"
          >
            <DoorOpen className="size-4 text-zinc-500" />
            Salones
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/horarios')}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors"
          >
            <CalendarClock className="size-4" />
            Programar horarios
          </button>
        </div>
      </div>

      {/* Tarjetas KPI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map((kpi) => {
          const Icon = kpi.icon
          return (
            <div
              key={kpi.label}
              className="flex flex-col justify-between rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-600">{kpi.label}</span>
                <div className="flex size-9 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600">
                  <Icon className="size-4" />
                </div>
              </div>

              <div className="my-4">
                <span className="text-3xl font-bold tracking-tight text-zinc-900">
                  {kpi.value}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span
                  className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-medium ${
                    kpi.badgeType === 'positive'
                      ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20'
                      : 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20'
                  }`}
                >
                  {kpi.badgeType === 'positive' ? (
                    <ArrowUpRight className="size-3" />
                  ) : (
                    <ArrowDownRight className="size-3" />
                  )}
                  {kpi.badge}
                </span>
                <span className="text-zinc-500">{kpi.subtext}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Tabla: Grupos con Cupo Crítico */}
      <div className="rounded-2xl border border-zinc-200/80 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-6 border-b border-zinc-200/80 gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-200/60">
              <AlertTriangle className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900">Grupos con cupo crítico</h2>
              <p className="text-xs text-zinc-500">
                Ocupación igual o superior al 85% de su capacidad
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/admin/grupos')}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            Ver todos los grupos
            <ArrowRight className="size-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-600">
            <thead className="bg-zinc-50/50 text-xs font-medium text-zinc-400 uppercase tracking-wider border-b border-zinc-200">
              <tr>
                <th className="px-6 py-3.5 font-medium">Clave</th>
                <th className="px-6 py-3.5 font-medium">Nivel / Idioma</th>
                <th className="px-6 py-3.5 font-medium">Salón</th>
                <th className="px-6 py-3.5 font-medium">Días / Horario</th>
                <th className="px-6 py-3.5 font-medium">Cupo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {CRITICAL_GROUPS.map((g) => {
                const percentage = Math.round((g.enrolled / g.capacity) * 100)

                return (
                  <tr key={g.code} className="hover:bg-zinc-50/60 transition-colors">
                    {/* Clave */}
                    <td className="px-6 py-4 font-medium text-zinc-900 font-mono text-xs">
                      {g.code}
                    </td>

                    {/* Nivel / Idioma */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-zinc-700">
                          {g.level}
                        </span>
                        <span className="font-medium text-zinc-900">{g.language}</span>
                      </div>
                    </td>

                    {/* Salón */}
                    <td className="px-6 py-4">
                      <div className="leading-tight">
                        <span className="font-medium text-zinc-900 font-mono">{g.room}</span>
                        <p className="text-xs text-zinc-400">{g.campus}</p>
                      </div>
                    </td>

                    {/* Días / Horario */}
                    <td className="px-6 py-4">
                      <div className="leading-tight">
                        <span className="font-medium text-zinc-800">{g.days}</span>
                        <p className="text-xs text-zinc-400 font-mono">{g.time}</p>
                      </div>
                    </td>

                    {/* Barra de progreso y Cupo */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-1.5 w-28 overflow-hidden rounded-full bg-zinc-100">
                          <div
                            className={`h-full rounded-full ${
                              g.color === 'red'
                                ? 'bg-red-500'
                                : g.color === 'orange'
                                ? 'bg-amber-500'
                                : 'bg-indigo-600'
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="font-mono text-xs font-semibold text-zinc-700">
                          {g.enrolled}/{g.capacity}
                        </span>
                        <span
                          className={`text-xs font-medium ${
                            g.status === 'Lleno'
                              ? 'text-red-600'
                              : g.status === 'Crítico'
                              ? 'text-amber-600'
                              : 'text-indigo-600'
                          }`}
                        >
                          {g.status}
                        </span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Dashboard