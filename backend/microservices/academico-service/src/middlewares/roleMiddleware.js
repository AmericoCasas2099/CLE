
const { fallo } = require("../utils/http");

// Middleware genérico para verificar roles
function roles(...permitidos) {
    return (req, res, next) => {
        if (!req.auth) {
            return next(
                fallo(
                    401,
                    "NO_AUTENTICADO",
                    "Debes iniciar sesión"
                )
            );
        }

        if (!permitidos.includes(req.auth.rol)) {
            return next(
                fallo(
                    403,
                    "ACCESO_DENEGADO",
                    "No tienes permiso para realizar esta acción"
                )
            );
        }

        next();
    };
}

// Alias para las rutas existentes
const permitirRoles = roles;

// Middlewares específicos
const soloAdministrador = roles("Administrador");
const soloMaestro = roles("Maestro");
const soloAlumno = roles("Alumno");

// Compatibilidad con rutas que utilizan admin
const admin = soloAdministrador;

module.exports = {
    roles,
    permitirRoles,
    admin,
    soloAdministrador,
    soloMaestro,
    soloAlumno
};
