const servicio = require("../services/usuarioService");
const repo = require("../repositories/usuarioRepository");

function obtenerId(req) {
    const texto = req.params.usuarioId;
    const id = Number(texto);
    if (!/^\d+$/.test(texto) || !Number.isSafeInteger(id) || id <= 0 || id > 2147483647) {
        const error = new Error("El ID debe ser un entero positivo válido");
        error.codigo = "ID_INVALIDO";
        error.status = 400;
        throw error;
    }
    return id;
}

async function crear(req, res, next) {
    try {
        const usuario = await servicio.crearUsuario(req.body);
        res.status(201).json({ usuario });
    } catch (error) { next(error); }
}

async function listar(req, res, next) {
    try {
        const resultado = await servicio.listarUsuarios(req.queryValidada);
        res.status(200).json(resultado);
    } catch (error) { next(error); }
}

async function obtenerPorId(req, res, next) {
    try {
        const usuario = await servicio.obtenerUsuario(obtenerId(req));
        res.status(200).json({ usuario });
    } catch (error) { next(error); }
}

async function actualizar(req, res, next) {
    try {
        const usuario = await servicio.actualizarUsuario(obtenerId(req), req.body);
        res.status(200).json({ usuario });
    } catch (error) { next(error); }
}

async function cambiarEstatus(req, res, next) {
    try {
        const usuario = await servicio.cambiarEstatus(obtenerId(req), req.body.estatus);
        res.status(200).json({ usuario });
    } catch (error) { next(error); }
}

async function cambiarRol(req, res, next) {
    try {
        const usuario_id = obtenerId(req);

        const usuario = await servicio.cambiarRol(
            usuario_id,
            req.body.rol_id
        );

        return res.status(200).json({
            usuario
        });

    } catch (error) {
        next(error);
    }
}

async function obtenerRoles(req, res, next) {
    try { res.status(200).json({ roles: await repo.obtenerRoles() }); }
    catch (error) { next(error); }
}

async function obtenerEstatus(req, res, next) {
    try { res.status(200).json({ estatus: await repo.obtenerEstatus() }); }
    catch (error) { next(error); }
}

module.exports = {
    crear, listar, obtenerPorId, actualizar, cambiarEstatus,
    cambiarRol, obtenerRoles, obtenerEstatus
};
