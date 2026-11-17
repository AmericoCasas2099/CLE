const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const START_HOUR = 7 // 07:00
const END_HOUR = 21 // 21:00
const ROW_HEIGHT = 44 // px por hora

export function formatTime(minutes) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function formatRange(start, end) {
  return `${formatTime(start)} – ${formatTime(end)}`
}

export function formatDays(days = []) {
  return days.map((d) => DAYS[d]).filter(Boolean).join(' · ')
}

export function slotsOverlap(a, b) {
  const sharedDay = a.days.some((d) => b.days.includes(d))
  if (!sharedDay) return false
  return a.start < b.end && b.start < a.end
}

const TONE_CLASSES = [
  'border-indigo-200 bg-indigo-50/90 text-indigo-950',
  'border-emerald-200 bg-emerald-50/90 text-emerald-950',
  'border-amber-200 bg-amber-50/90 text-amber-950',
  'border-sky-200 bg-sky-50/90 text-sky-950',
]

export function WeeklySchedule({ groups = [] }) {
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)
  const totalHeight = hours.length * ROW_HEIGHT

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[620px]">
        {/* Cabecera de días */}
        <div className="grid grid-cols-[56px_repeat(6,minmax(0,1fr))] border-b border-zinc-200 pb-2 text-center text-xs font-medium text-zinc-500">
          <div />
          {DAYS.map((day) => (
            <div key={day}>{day}</div>
          ))}
        </div>

        {/* Cuerpo de horas y bloques */}
        <div className="relative grid grid-cols-[56px_repeat(6,minmax(0,1fr))]" style={{ height: `${totalHeight}px` }}>
          {/* Columna de horas */}
          <div className="relative border-r border-zinc-100">
            {hours.map((h, idx) => (
              <div
                key={h}
                style={{ top: `${idx * ROW_HEIGHT}px`, height: `${ROW_HEIGHT}px` }}
                className="absolute inset-x-0 pr-2 text-right font-mono text-[11px] text-zinc-400 -translate-y-2"
              >
                {`${String(h).padStart(2, '0')}:00`}
              </div>
            ))}
          </div>

          {/* Columnas por día */}
          {DAYS.map((day, dayIndex) => {
            const dayGroups = groups.filter((g) => g.days.includes(dayIndex))

            return (
              <div key={day} className="relative border-r border-zinc-100 last:border-r-0">
                {/* Líneas guía horizontales */}
                {hours.map((h, idx) => (
                  <div
                    key={h}
                    style={{ top: `${idx * ROW_HEIGHT}px`, height: `${ROW_HEIGHT}px` }}
                    className="border-b border-zinc-100/80"
                  />
                ))}

                {/* Bloques de clases */}
                {dayGroups.map((g, idx) => {
                  const top = ((g.start - START_HOUR * 60) / 60) * ROW_HEIGHT
                  const height = ((g.end - g.start) / 60) * ROW_HEIGHT
                  const tone = TONE_CLASSES[idx % TONE_CLASSES.length]

                  return (
                    <div
                      key={`${g.id}-${dayIndex}`}
                      style={{ top: `${top + 2}px`, height: `${Math.max(height - 4, 24)}px` }}
                      className={`absolute inset-x-1 z-10 overflow-hidden rounded-lg border px-2 py-1 text-left shadow-2xs ${tone}`}
                    >
                      <p className="truncate text-[11px] font-semibold leading-tight">
                        {g.language} {g.level}
                      </p>
                      <p className="truncate font-mono text-[10px] opacity-80">
                        {g.roomCode} · {formatTime(g.start)}
                      </p>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}