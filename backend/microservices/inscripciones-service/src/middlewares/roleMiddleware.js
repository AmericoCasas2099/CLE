const { fallo } = require("../utils/http");
function roles(...permitidos) { return (req,res,next) => {
  if (!permitidos.includes(req.auth?.rol)) return next(fallo(403,"ACCESO_DENEGADO","No tienes permiso"));
  next();
}; }
module.exports = { roles, admin:roles("Administrador") };
