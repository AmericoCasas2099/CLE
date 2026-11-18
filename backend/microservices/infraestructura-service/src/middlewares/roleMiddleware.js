function permitirRoles(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.auth || !rolesPermitidos.includes(req.auth.rol)) {
      return res.status(403).json({ error: "ACCESO_DENEGADO", mensaje: "No tienes permisos para realizar esta acción" });
    }
    next();
  };
}
const soloAdministrador = permitirRoles("Administrador");
module.exports = { permitirRoles, soloAdministrador };
