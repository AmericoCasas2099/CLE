import {
  LayoutDashboard,
  Building2,
  DoorOpen,
  Languages,
  BarChart3,
  UserCheck,
  GraduationCap,
  Users,
  CalendarClock,
  ClipboardList,
  BookOpen,
  ShieldCheck,
  Presentation,
} from 'lucide-react'

export const BrandIcon = BookOpen

export const NAV_ADMIN = [
  {
    label: 'PANEL PRINCIPAL',
    items: [
      { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'ACCESO Y ROLES',
    items: [
      { label: 'Usuarios', path: '/admin/usuarios', icon: ShieldCheck },
    ],
  },
  {
    label: 'INFRAESTRUCTURA',
    items: [
      { label: 'Campus', path: '/admin/campus', icon: Building2 },
      { label: 'Salones', path: '/admin/salones', icon: DoorOpen },
    ],
  },
  {
    label: 'GESTIÓN ACADÉMICA',
    items: [
      { label: 'Idiomas', path: '/admin/idiomas', icon: Languages },
      { label: 'Niveles', path: '/admin/niveles', icon: BarChart3 },
      { label: 'Maestros', path: '/admin/maestros', icon: UserCheck },
      { label: 'Alumnos', path: '/admin/alumnos', icon: GraduationCap },
    ],
  },
  {
    label: 'OPERACIÓN',
    items: [
      { label: 'Grupos', path: '/admin/grupos', icon: Users },
      { label: 'Horarios', path: '/admin/horarios', icon: CalendarClock },
      { label: 'Inscripciones', path: '/admin/inscripciones', icon: ClipboardList },
    ],
  },
  {
    label: 'Usuarios',
    items: [
      { label: 'Mi Perfil', path: '/docente/perfil', icon: UserCheck },
    ],
  },
]

export const NAV_MAESTRO = [
  {
    label: 'DOCENCIA',
    items: [
      { label: 'Mis Grupos', path: '/maestros/grupos', icon: Users },
      { label: 'Mi Horario', path: '/maestros/horario', icon: CalendarClock },
      { label: 'Mi Perfil', path: '/maestros/perfil', icon: UserCheck },
    ],
  },
]

export const NAV_ALUMNO = [
  {
    label: 'ESTUDIANTE',
    items: [
      { label: 'Mi Horario', path: '/alumnos/mitablero', icon: CalendarClock },
      { label: 'Mi Perfil', path: '/alumnos/perfil', icon: GraduationCap },
    ],
  },
]