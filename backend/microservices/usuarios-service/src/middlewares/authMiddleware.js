const { verificarToken } = require("../utils/jwt");
const repo = require("../repositories/usuarioRepository");
const { formatearUsuario } = require("../services/authService");

async function authMiddleware(req, res, next) {
    const header = req.headers.authorization || "";
    const partes = header.split(" ");
    if (partes.length !== 2 || partes[0] !== "Bearer" || !partes[1]) {
        return res.status(401).json({
            error: { codigo: "TOKEN_REQUERIDO", mensaje: "Envía Authorization: Bearer <token>" }
        });
    }

    let payload;
    try {
        payload = verificarToken(partes[1]);
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({
                error: { codigo: "TOKEN_EXPIRADO", mensaje: "La sesión ha expirado" }
            });
        }
        if (error.name === "JsonWebTokenError" || error.name === "NotBeforeError") {
            return res.status(401).json({
                error: { codigo: "TOKEN_INVALIDO", mensaje: "Token inválido" }
            });
        }
        return next(error);
    }

    try {
        const usuario = await repo.buscarPorId(payload.sub);
        if (!usuario) {
            return res.status(401).json({
                error: { codigo: "USUARIO_NO_ENCONTRADO", mensaje: "La cuenta no existe" }
            });
        }
        if (usuario.estatus !== "Activo") {
            return res.status(403).json({
                error: { codigo: "USUARIO_INACTIVO", mensaje: "La cuenta está inactiva" }
            });
        }
        req.auth = { usuario_id: usuario.usuario_id, rol: usuario.rol };
        req.usuario = formatearUsuario(usuario);
        next();
    } catch (error) {
        next(error);
    }
}

module.exports = authMiddleware;
