function roleMiddleware(...rolesPermitidos) {
    return (req, res, next) => {
        if (!req.auth) {
            return res.status(401).json({
                error: { codigo: "NO_AUTENTICADO", mensaje: "Inicia sesión" }
            });
        }
        if (!rolesPermitidos.includes(req.auth.rol)) {
            return res.status(403).json({
                error: { codigo: "ACCESO_DENEGADO", mensaje: "No tienes permisos" }
            });
        }
        next();
    };
}
module.exports = roleMiddleware;
