const bcrypt = require("bcrypt");
const pool = require("../config/db");
const repo = require("../repositories/usuarioRepository");
const { formatearUsuario } = require("./authService");

const ROLES_PERMITIDOS = new Set(["Administrador", "Maestro", "Alumno"]);

class UsuarioError extends Error {
    constructor(codigo, mensaje, status = 400) {
        super(mensaje);
        this.codigo = codigo;
        this.status = status;
    }
}

function manejarErrorBD(error) {
    if (error.code === "23505") {
        throw new UsuarioError("DATOS_DUPLICADOS", "Ya existe un usuario con esos datos", 409);
    }
    if (error.code === "23503") {
        throw new UsuarioError("REFERENCIA_INVALIDA", "Rol o estatus inexistente", 400);
    }
    throw error;
}

async function bloquearAdministracion(db) {
    await db.query("SELECT pg_advisory_xact_lock($1)", [704301]);
}

async function obtenerRolValido(rolId, db) {
    const rol = await repo.buscarRolPorId(rolId, db);
    if (!rol || !ROLES_PERMITIDOS.has(rol.nombre)) {
        throw new UsuarioError("ROL_INVALIDO", "El rol indicado no es válido");
    }
    return rol;
}

async function crearUsuario(datos) {
    const db = await pool.connect();
    try {
        await db.query("BEGIN");
        await bloquearAdministracion(db);
        const rol = await obtenerRolValido(datos.rol_id, db);
        const estatus = await repo.buscarEstatusPorNombre("Activo", db);
        if (!estatus) {
            throw new UsuarioError("ESTATUS_NO_CONFIGURADO", "No existe el estatus Activo", 500);
        }
        const password_hash = await bcrypt.hash(datos.password, 12);
        const nuevo = await repo.crear({
            identificador_acceso: datos.identificador_acceso,
            correo: datos.correo ?? null,
            password_hash,
            rol_id: rol.rol_id,
            estatus_id: estatus.estatus_id
        }, db);
        const usuario = await repo.buscarPorId(nuevo.usuario_id, db);
        await db.query("COMMIT");
        return formatearUsuario(usuario);
    } catch (error) {
        await db.query("ROLLBACK");
        manejarErrorBD(error);
    } finally {
        db.release();
    }
}

async function listarUsuarios({ pagina = 1, limite = 20 } = {}) {
    const [usuarios, total] = await Promise.all([
        repo.listar({ pagina, limite }),
        repo.contarUsuarios()
    ]);
    return { usuarios: usuarios.map(formatearUsuario), total, pagina, limite };
}

async function obtenerUsuario(id) {
    const usuario = await repo.buscarPorId(id);
    if (!usuario) {
        throw new UsuarioError("USUARIO_NO_ENCONTRADO", "El usuario no existe", 404);
    }
    return formatearUsuario(usuario);
}

async function actualizarUsuario(usuario_id, datos) {
    try {
        // Verificar que exista el usuario
        const usuario = await repo.buscarPorId(usuario_id);

        if (!usuario) {
            throw new UsuarioError(
                "USUARIO_NO_ENCONTRADO",
                "El usuario no existe",
                404
            );
        }

        // Actualizar únicamente el correo
        await repo.actualizar(usuario_id, datos);

        // Recuperar el usuario actualizado
        const actualizado = await repo.buscarPorId(usuario_id);

        return formatearUsuario(actualizado);

    } catch (error) {
        manejarErrorBD(error);
    }
}

async function cambiarEstatus(id, nombre) {
    const db = await pool.connect();
    try {
        await db.query("BEGIN");
        await bloquearAdministracion(db);
        const actual = await repo.buscarPorId(id, db);
        if (!actual) {
            throw new UsuarioError("USUARIO_NO_ENCONTRADO", "El usuario no existe", 404);
        }
        const estatus = await repo.buscarEstatusPorNombre(nombre, db);
        if (!estatus) {
            throw new UsuarioError("ESTATUS_INVALIDO", "No existe ese estatus");
        }
        if (actual.rol === "Administrador" && actual.estatus === "Activo" &&
            nombre === "Inactivo" &&
            (await repo.contarAdministradoresActivos(db)) <= 1) {
            throw new UsuarioError("ULTIMO_ADMINISTRADOR", "No se puede inactivar el último administrador activo", 409);
        }
        await repo.cambiarEstatus(id, estatus.estatus_id, db);
        const usuario = await repo.buscarPorId(id, db);
        await db.query("COMMIT");
        return formatearUsuario(usuario);
    } catch (error) {
        await db.query("ROLLBACK");
        manejarErrorBD(error);
    } finally {
        db.release();
    }
}

async function cambiarRol(id, rolId) {
    const db = await pool.connect();

    try {
        await db.query("BEGIN");

        // Evitar modificaciones concurrentes que dejen al sistema sin administradores activos
        
        await bloquearAdministracion(db);

        const actual = await repo.buscarPorId(id, db);

        if (!actual) {
            throw new UsuarioError(
                "USUARIO_NO_ENCONTRADO",
                "El usuario no existe",
                404
            );
        }

        const nuevoRol = await obtenerRolValido(
            rolId,
            db
        );

        // Proteger al último administrador activo
        if (
            actual.rol === "Administrador" &&
            actual.estatus === "Activo" &&
            nuevoRol.nombre !== "Administrador"
        ) {
            const total = await repo.contarAdministradoresActivos(db);

            if (total <= 1) {
                throw new UsuarioError(
                    "ULTIMO_ADMINISTRADOR",
                    "No se puede cambiar el rol del último administrador activo",
                    409
                );
            }
        }

        await repo.cambiarRol(id, nuevoRol.rol_id, db);

        const usuario = await repo.buscarPorId(id, db);

        await db.query("COMMIT");

        return formatearUsuario(usuario);

    } catch (error) {
        await db.query("ROLLBACK");
        manejarErrorBD(error);

    } finally {
        db.release();
    }
}

module.exports = {
    crearUsuario, listarUsuarios, obtenerUsuario,
    actualizarUsuario, cambiarEstatus, cambiarRol, UsuarioError
};
