// Usa el JWT verificado por authMiddleware: req.auth.
function permitirRoles(...rolesPermitidos) {
  return (req, res, next) => {
    const rol = req.auth?.rol;
    if (!rol || !rolesPermitidos.includes(rol)) {
      return res.status(403).json({
        error: "ACCESO_DENEGADO",
        mensaje: "No tienes permisos para realizar esta acción"
      });
    }
    next();
  };
}

const soloAdministrador = permitirRoles("Administrador");
const soloMaestro = permitirRoles("Maestro");
const soloAlumno = permitirRoles("Alumno");

module.exports = { permitirRoles, soloAdministrador, soloMaestro, soloAlumno };
