import { WeeklySchedule } from '@/components/WeeklySchedule'
import { TEACHER_GROUPS } from './MisGrupos'

export function MiHorario() {
  const hours = TEACHER_GROUPS.reduce((s, g) => s + ((g.end - g.start) / 60) * g.days.length, 0)

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Mi Horario</h1>
        <p className="mt-1 text-sm text-zinc-500">{hours} horas frente a grupo por semana</p>
      </div>

      <section
        className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm sm:p-5"
        aria-label="Horario semanal"
      >
        <WeeklySchedule groups={TEACHER_GROUPS} />
      </section>
    </div>
  )
}

export default MiHorario