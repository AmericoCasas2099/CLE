export const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
export const LANGUAGES = ['Inglés', 'Francés', 'Alemán', 'Italiano', 'Japonés']

export const TIME_SLOTS = Array.from({ length: 29 }, (_, i) => 7 * 60 + i * 30)

export function formatTime(minutes) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function formatDays(days) {
  return [...days].sort((a, b) => a - b).map((d) => DAYS[d]).join(' · ')
}

export function formatRange(start, end) {
  return `${formatTime(start)} – ${formatTime(end)}`
}

export function slotsOverlap(a, b) {
  return a.days.some((d) => b.days.includes(d)) && a.start < b.end && b.start < a.end
}

export function findScheduleConflicts(groups, candidate) {
  const conflicts = []
  for (const g of groups) {
    if (g.id === candidate.id || !slotsOverlap(g, candidate)) continue
    if (g.roomId === candidate.roomId) conflicts.push({ group: g, reason: 'Salón' })
    else if (g.teacherId === candidate.teacherId) conflicts.push({ group: g, reason: 'Docente' })
  }
  return conflicts
}