const bcrypt = require("bcrypt");
const usuarioRepository = require("../repositories/usuarioRepository");
const pool = require("../config/db");

const { generarToken, verificarToken } = require("../utils/jwt");

class AuthError extends Error {
    constructor(codigo, mensaje, status = 401) {
        super(mensaje);
        this.codigo = codigo;
        this.status = status;
    }
}

function formatearUsuario(usuario) {
    return {
        usuario_id: usuario.usuario_id,
        identificador_acceso: usuario.identificador_acceso,
        correo: usuario.correo,
        rol: { rol_id: usuario.rol_id, nombre: usuario.rol },
        estatus: { estatus_id: usuario.estatus_id, nombre: usuario.estatus },
        fecha_creacion: usuario.fecha_creacion
    };
}

async function login(identificador, password) {
    const usuario = await usuarioRepository.buscarPorIdentificador(identificador);
    // Respuesta genérica para usuario inexistente o contraseña equivocada.
    if (!usuario || !(await bcrypt.compare(password, usuario.password_hash))) {
        throw new AuthError("CREDENCIALES_INVALIDAS", "Identificador o contraseña incorrectos");
    }
    if (usuario.estatus !== "Activo") {
        throw new AuthError("USUARIO_INACTIVO", "La cuenta está inactiva", 403);
    }

    const token = generarToken({ usuario_id: usuario.usuario_id, rol: usuario.rol });
    const payload = verificarToken(token);
    return {
        token,
        token_type: "Bearer",
        expires_in: payload.exp - payload.iat,
        usuario: formatearUsuario(usuario)
    };
}

async function cambiarPassword(usuarioId, passwordActual, passwordNueva) {
    const db = await pool.connect();

    try {
        await db.query("BEGIN");

        // Bloquear el registro para evitar cambios simultáneos
        const resultado = await db.query(
            `
            SELECT password_hash
            FROM public.usuario
            WHERE usuario_id = $1
            FOR UPDATE
            `,
            [usuarioId]
        );

        const usuario = resultado.rows[0];

        if (!usuario) {
            throw new AuthError(
                "USUARIO_NO_ENCONTRADO",
                "El usuario no existe",
                404
            );
        }

        // Verificar contraseña actual
        const passwordValida = await bcrypt.compare(
            passwordActual,
            usuario.password_hash
        );

        if (!passwordValida) {
            throw new AuthError(
                "PASSWORD_INCORRECTA",
                "La contraseña actual es incorrecta",
                400
            );
        }

        // Comprobar que realmente sea diferente
        const esIgual = await bcrypt.compare(
            passwordNueva,
            usuario.password_hash
        );

        if (esIgual) {
            throw new AuthError(
                "PASSWORD_REPETIDA",
                "La nueva contraseña debe ser diferente a la actual",
                400
            );
        }

        // Generar hash y actualizar contraseña
        const nuevoHash = await bcrypt.hash(
            passwordNueva,
            12
        );

        await usuarioRepository.actualizarPassword(
            usuarioId,
            nuevoHash,
            db
        );

        await db.query("COMMIT");

    } catch (error) {
        await db.query("ROLLBACK");
        throw error;

    } finally {
        db.release();
    }
}

module.exports = { login, formatearUsuario, cambiarPassword, AuthError };
