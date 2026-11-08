const repo = require("../repositories/maestroRepository");

function errorHttp(status, codigo, mensaje) {
  return Object.assign(new Error(mensaje), { status, codigo });
}

// El Administrador que crea al maestro debe poder consultar usuarios-service.
async function verificarCuentaMaestro(usuarioId, authorization) {
  const base = process.env.USUARIOS_SERVICE_URL || "http://localhost:3001";
  let respuesta;
  try {
    respuesta = await fetch(`${base}/api/v1/usuarios/${usuarioId}`, {
      headers: { Authorization: authorization },
      signal: AbortSignal.timeout(5000)
    });
  } catch {
    throw errorHttp(503, "USUARIOS_NO_DISPONIBLE", "No se pudo consultar usuarios-service");
  }
  if (respuesta.status === 404) {
    throw errorHttp(400, "USUARIO_NO_EXISTE", "El usuario indicado no existe");
  }
  if (!respuesta.ok) {
    throw errorHttp(502, "ERROR_VALIDANDO_USUARIO", "No se pudo verificar el usuario en usuarios-service");
  }

  const datos = await respuesta.json();
  const usuario = datos.usuario || datos.data || datos;
  const rol = usuario.rol?.nombre || usuario.rol_nombre || usuario.rol;
  if (rol !== "Maestro") {
    throw errorHttp(400, "ROL_INCORRECTO", "El usuario debe tener rol Maestro");
  }
  const estatus = usuario.estatus?.nombre || usuario.estatus_nombre || usuario.estatus;
  if (estatus && estatus !== "Activo") {
    throw errorHttp(400, "USUARIO_INACTIVO", "La cuenta del maestro debe estar activa");
  }
}

async function registrar(datos, authorization) {
  await verificarCuentaMaestro(datos.usuario_id, authorization);
  const maestro = await repo.crear(datos);
  if (!maestro) throw errorHttp(500, "ESTATUS_ACTIVO_NO_EXISTE", "No existe el estatus académico Activo");
  return maestro;
}

async function listar(pagina, limite) {
  return repo.listar(pagina, limite);
}

async function obtener(maestroId) {
  const maestro = await repo.obtenerPorId(maestroId);
  if (!maestro) throw errorHttp(404, "MAESTRO_NO_ENCONTRADO", "No existe el maestro");
  return maestro;
}

async function modificar(maestroId, cambios) {
  await obtener(maestroId);
  return repo.modificar(maestroId, cambios);
}

async function cambiarEstatus(maestroId, estatusId) {
  const estatus = await repo.obtenerEstatus(estatusId);
  if (!estatus || !["Activo", "Inactivo"].includes(estatus.nombre)) {
    throw errorHttp(400, "ESTATUS_INVALIDO", "El estatus académico debe ser Activo o Inactivo");
  }
  await obtener(maestroId);
  return repo.cambiarEstatus(maestroId, estatusId);
}


async function obtenerMiPerfil(usuarioId) {
    const maestro = await repo.obtenerPorUsuarioId(usuarioId);

    if (!maestro) {
        const error = new Error("PERFIL_NO_REGISTRADO");
        error.status = 404;
        throw error;
    }

    return maestro;
}

async function registrarMiPerfil(usuarioId, datos) {
    const existente = await repo.obtenerPorUsuarioId(usuarioId);

    if (existente) {
        const error = new Error("PERFIL_YA_EXISTE");
        error.status = 409;
        throw error;
    }

    const creado = await repo.crearPerfilPropio(usuarioId, datos);

    if (!creado) {
        const error = new Error("ESTATUS_ACTIVO_NO_EXISTE");
        error.status = 500;
        throw error;
    }

    return repo.obtenerPorUsuarioId(usuarioId);
}


module.exports = { registrar, listar, obtener, modificar, cambiarEstatus,obtenerMiPerfil, registrarMiPerfil};
