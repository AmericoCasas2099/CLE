const pool = require("../config/db");

const SELECT_BASE = `
    SELECT u.usuario_id, u.correo, u.fecha_creacion,
           r.rol_id, r.nombre AS rol,
           e.estatus_id, e.nombre AS estatus
    FROM public.usuario u
    INNER JOIN public.rol r ON r.rol_id = u.rol_id
    INNER JOIN public.estatus_usuario e ON e.estatus_id = u.estatus_id
`;


async function buscarPorCorreo(correo) {
    const resultado = await pool.query(
        `SELECT
            u.usuario_id,
            u.correo,
            u.password_hash,
            u.rol_id,
            r.nombre AS rol,
            u.estatus_id,
            e.nombre AS estatus
         FROM public.usuario u
         JOIN public.rol r ON u.rol_id = r.rol_id
         JOIN public.estatus_usuario e ON u.estatus_id = e.estatus_id
         WHERE LOWER(TRIM(u.correo)) = LOWER(TRIM($1))`,
        [correo]
    );

    return resultado.rows[0] || null;
}


async function buscarPorId(id, db = pool) {
    const { rows } = await db.query(`${SELECT_BASE} WHERE u.usuario_id = $1`, [id]);
    return rows[0] || null;
}

async function listar({ pagina, limite }, db = pool) {
    const offset = (pagina - 1) * limite;
    const { rows } = await db.query(
        `${SELECT_BASE} ORDER BY u.usuario_id LIMIT $1 OFFSET $2`,
        [limite, offset]
    );
    return rows;
}

async function contarUsuarios(db = pool) {
    const { rows } = await db.query("SELECT COUNT(*)::integer AS total FROM public.usuario");
    return rows[0].total;
}

async function contarAdministradoresActivos(db = pool) {
    const { rows } = await db.query(`
        SELECT COUNT(*)::integer AS total
        FROM public.usuario u
        INNER JOIN public.rol r ON r.rol_id = u.rol_id
        INNER JOIN public.estatus_usuario e ON e.estatus_id = u.estatus_id
        WHERE r.nombre = 'Administrador' AND e.nombre = 'Activo'
    `);
    return rows[0].total;
}

async function buscarRolPorId(id, db = pool) {
    const { rows } = await db.query("SELECT rol_id, nombre FROM public.rol WHERE rol_id = $1", [id]);
    return rows[0] || null;
}

async function buscarRolPorNombre(nombre, db = pool) {
    const { rows } = await db.query("SELECT rol_id, nombre FROM public.rol WHERE nombre = $1", [nombre]);
    return rows[0] || null;
}

async function buscarEstatusPorNombre(nombre, db = pool) {
    const { rows } = await db.query(
        "SELECT estatus_id, nombre FROM public.estatus_usuario WHERE nombre = $1", [nombre]
    );
    return rows[0] || null;
}

async function obtenerRoles(db = pool) {
    const { rows } = await db.query("SELECT rol_id, nombre FROM public.rol ORDER BY rol_id");
    return rows;
}

async function obtenerEstatus(db = pool) {
    const { rows } = await db.query(
        "SELECT estatus_id, nombre FROM public.estatus_usuario ORDER BY estatus_id"
    );
    return rows;
}

async function crear(datos, db = pool) {
    const { rows } = await db.query(`
        INSERT INTO public.usuario
            (correo, password_hash, rol_id, estatus_id)
        VALUES ($1, $2, $3, $4)
        RETURNING usuario_id
    `, [datos.correo, datos.password_hash,
        datos.rol_id, datos.estatus_id]);
    return rows[0];
}

//El admin cambia el correo de un usuario
async function actualizar(usuario_id, datos, db = pool) {
    const resultado = await db.query(
        `
        UPDATE public.usuario
        SET correo = $1
        WHERE usuario_id = $2
        RETURNING usuario_id
        `,
        [
            datos.correo,
            usuario_id
        ]
    );

    return resultado.rows[0] || null;
}

async function cambiarEstatus(id, estatusId, db = pool) {
    const { rows } = await db.query(`
        UPDATE public.usuario SET estatus_id = $1
        WHERE usuario_id = $2 RETURNING usuario_id
    `, [estatusId, id]);
    return rows[0] || null;
}

async function cambiarRol(id, rolId, db = pool) {
    const { rows } = await db.query(
        `
        UPDATE public.usuario
        SET rol_id = $1
        WHERE usuario_id = $2
        RETURNING usuario_id
        `,
        [rolId, id]
    );

    return rows[0] || null;
}

async function obtenerPasswordHash(id, db = pool) {
    const { rows } = await db.query(
        `
        SELECT password_hash
        FROM public.usuario
        WHERE usuario_id = $1
        `,
        [id]
    );

    return rows[0] || null;
}

async function actualizarPassword(id, passwordHash, db = pool) {
    const { rows } = await db.query(
        `
        UPDATE public.usuario
        SET password_hash = $1
        WHERE usuario_id = $2
        RETURNING usuario_id
        `,
        [passwordHash, id]
    );

    return rows[0] || null;
}


async function obtenerUsuarioParaCambioCorreo(client, usuarioId) {
    const resultado = await client.query(
        `SELECT
            u.usuario_id,
            u.correo,
            u.password_hash,
            e.nombre AS estatus
         FROM public.usuario u
         INNER JOIN public.estatus_usuario e
            ON e.estatus_id = u.estatus_id
         WHERE u.usuario_id = $1
         FOR UPDATE OF u`,
        [usuarioId]
    );

    return resultado.rows[0] || null;
}

//El usuario cambia su propio correo
async function actualizarCorreoUsuario(client, usuarioId, correo) {
    const resultado = await client.query(
        `UPDATE public.usuario
         SET correo = $1
         WHERE usuario_id = $2
         RETURNING usuario_id, correo`,
        [correo, usuarioId]
    );

    return resultado.rows[0] || null;
}


module.exports = {
    buscarPorId, buscarPorCorreo, listar, contarUsuarios,
    contarAdministradoresActivos, buscarRolPorId, buscarRolPorNombre,
    buscarEstatusPorNombre, obtenerRoles, obtenerEstatus,
    crear, actualizar, cambiarEstatus, cambiarRol, obtenerPasswordHash, actualizarPassword, 
    obtenerUsuarioParaCambioCorreo, actualizarCorreoUsuario
};
