import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Login } from './pages/Login'
import { AppShell } from './components/AppShell'
import { Dashboard } from './pages/admin/Dashboard'
//import { Campus } from './pages/admin/Campus'
//import { MisGrupos } from './pages/maestro/MisGrupos'
//import { MiHorario } from './pages/alumno/MiHorario'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta inicial de login */}
        <Route path="/login" element={<Login />} />

        <Route element={<AppShell />}>
          <Route path="/admin/dashboard" element={<Dashboard />} />
          {/* Aquí agregaremos /admin/alumnos, /admin/maestros, etc. */}
        </Route>
        {/* <Route path="/admin/campus" element={<Campus />} /> */}

        {/* Módulos de Docente y Alumno */}
        {/* <Route path="/docente/grupos" element={<MisGrupos />} /> */}
        {/* <Route path="/alumno/horario" element={<MiHorario />} /> */}

        {/* Redirección por defecto */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;