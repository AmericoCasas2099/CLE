const jwt = require("jsonwebtoken");

const ISSUER = "cle-usuarios-service";
const AUDIENCE = "cle-api";

function generarToken(usuario) {
    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET no está configurado");
    }

    return jwt.sign(
        {
            rol: usuario.rol
        },
        process.env.JWT_SECRET,
        {
            subject: String(usuario.usuario_id),
            expiresIn: process.env.JWT_EXPIRES_IN || "1h",
            algorithm: "HS256",
            issuer: ISSUER,
            audience: AUDIENCE
        }
    );
}

function verificarToken(token) {
    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET no está configurado");
    }

    return jwt.verify(
        token,
        process.env.JWT_SECRET,
        {
            algorithms: ["HS256"],
            issuer: ISSUER,
            audience: AUDIENCE
        }
    );
}

module.exports = {
    generarToken,
    verificarToken
};