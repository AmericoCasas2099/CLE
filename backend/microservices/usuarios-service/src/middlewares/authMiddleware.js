const { verificarToken } = require("../utils/jwt");

function authMiddleware(req, res, next) {
    const authorization = req.headers.authorization;

    if (!authorization) {
        return res.status(401).json({
            error: {
                codigo: "TOKEN_REQUERIDO",
                mensaje: "Se requiere un token de autenticación"
            }
        });
    }

    const partes = authorization.split(" ");

    if (
        partes.length !== 2 ||
        partes[0] !== "Bearer" ||
        !partes[1]
    ) {
        return res.status(401).json({
            error: {
                codigo: "FORMATO_TOKEN_INVALIDO",
                mensaje: "El token debe enviarse como Bearer <token>"
            }
        });
    }

    try {
        const decoded = verificarToken(partes[1]);

        req.auth = {
            usuario_id: decoded.sub,
            rol: decoded.rol
        };

        next();

    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({
                error: {
                    codigo: "TOKEN_EXPIRADO",
                    mensaje: "La sesión ha expirado"
                }
            });
        }

        if (error.name === "JsonWebTokenError" ||
            error.name === "NotBeforeError") {
            return res.status(401).json({
                error: {
                    codigo: "TOKEN_INVALIDO",
                    mensaje: "Token de autenticación inválido"
                }
            });
        }

        next(error);
    }
}

module.exports = authMiddleware;