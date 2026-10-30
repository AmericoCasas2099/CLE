const jwt = require("jsonwebtoken");

const ISSUER = "cle-usuarios-service";
const AUDIENCE = "cle-api";

function obtenerSecreto() {
    if (!process.env.JWT_SECRET || Buffer.byteLength(process.env.JWT_SECRET) < 32) {
        throw new Error("Configura JWT_SECRET con al menos 32 bytes aleatorios");
    }
    return process.env.JWT_SECRET;
}

function generarToken(usuario) {
    return jwt.sign(
        { rol: usuario.rol },
        obtenerSecreto(),
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
    return jwt.verify(token, obtenerSecreto(), {
        algorithms: ["HS256"],
        issuer: ISSUER,
        audience: AUDIENCE
    });
}

module.exports = { generarToken, verificarToken };
