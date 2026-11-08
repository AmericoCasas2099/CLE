const repo = require("../repositories/alumnoRepository");

function errorHttp(status, codigo, mensaje) {
  return Object.assign(new Error(mensaje), { status, codigo });
}

function idDelToken(auth) {
  const id = Number(auth?.sub);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw errorHttp(401, "TOKEN_INVALIDO", "El token no contiene un identificador válido");
  }
  return id;
}

// Consulta entre microservicios solo al CREAR desde el administrador.
// Se utiliza su JWT porque GET /usuarios/:id es exclusivo de Administradores.
async function verificarCuentaAlumno(usuarioId, authorization) {
  const base = (process.env.USUARIOS_SERVICE_URL || "http://localhost:3001").replace(/\/$/, "");
  let respuesta;
  try {
    respuesta = await fetch(`${base}/api/v1/usuarios/${usuarioId}`, {
      headers: { Authorization: authorization },
      signal: AbortSignal.timeout(5000)
    });
  } catch {
    throw errorHttp(503, "USUARIOS_NO_DISPONIBLE", "No fue posible conectar con usuarios-service");
  }
  if (respuesta.status === 404) {
    throw errorHttp(400, "USUARIO_NO_EXISTE", "La cuenta indicada no existe");
  }
  if (!respuesta.ok) {
    throw errorHttp(502, "ERROR_VALIDANDO_USUARIO", "No se pudo verificar el usuario en usuarios-service");
  }

  const datos = await respuesta.json();
  const usuario = datos.usuario || datos.data || datos;
  const rol = usuario.rol?.nombre || usuario.rol_nombre || usuario.rol;
  const estatus = usuario.estatus?.nombre || usuario.estatus_nombre || usuario.estatus;

  if (rol !== "Alumno") {
    throw errorHttp(400, "ROL_INCORRECTO", "La cuenta debe tener rol Alumno");
  }
  if (estatus && estatus !== "Activo") {
    throw errorHttp(400, "USUARIO_INACTIVO", "La cuenta del alumno debe estar activa");
  }
}

// Validación de reglas de negocio para Interno y Externo.
async function validarDatosAcademicos(datos) {
  const tipo = await repo.obtenerTipoAlumno(datos.tipo_alumno_id);
  if (!tipo) {
    throw errorHttp(400, "TIPO_ALUMNO_INVALIDO", "No existe el tipo de alumno");
  }
  switch (tipo.nombre.trim().toLowerCase()) {
    case "interno": {
      if (!datos.matricula?.trim()) {
        throw errorHttp(400, "MATRICULA_REQUERIDA", "El alumno interno debe proporcionar su matrícula");
      }
      if (datos.carrera_id == null || datos.semestre == null) {
        throw errorHttp(400, "DATOS_INTERNOS_REQUERIDOS",
          "El alumno interno debe proporcionar carrera y semestre");
      }
      const carrera = await repo.obtenerCarrera(datos.carrera_id);
      if (!carrera || carrera.estatus !== "Activo") {
        throw errorHttp(400, "CARRERA_INVALIDA", "La carrera no existe o está inactiva");
      }
      break;
    }
    case "externo":
      if (datos.matricula != null || datos.carrera_id != null || datos.semestre != null) {
        throw errorHttp(400, "DATOS_EXTERNO_INVALIDOS",
          "El alumno externo no debe tener matrícula, carrera ni semestre");
      }
      break;
    default:
      throw errorHttp(400, "TIPO_ALUMNO_INVALIDO", "El tipo debe ser Interno o Externo");
  }
}

function normalizar(datos) {
  return {
    ...datos,
    matricula: datos.matricula ?? null,
    apellido_materno: datos.apellido_materno ?? null,
    telefono: datos.telefono ?? null,
    carrera_id: datos.carrera_id ?? null,
    semestre: datos.semestre ?? null
  };
}

async function registrar(datos, authorization) {
  await verificarCuentaAlumno(datos.usuario_id, authorization);
  const completo = normalizar(datos);
  await validarDatosAcademicos(completo);
  const alumno = await repo.crear(completo);
  if (!alumno) {
    throw errorHttp(500, "ESTATUS_ACTIVO_NO_EXISTE", "No está configurado el estatus académico Activo");
  }
  return alumno;
}

async function registrarMiPerfil(auth, datos) {
  // El JWT verificado proporciona la identidad. El body NO admite usuario_id.
  const usuarioId = idDelToken(auth);
  if (await repo.obtenerPorUsuarioId(usuarioId)) {
    throw errorHttp(409, "PERFIL_YA_EXISTE", "Ya tienes un perfil de alumno");
  }
  const completo = normalizar({ ...datos, usuario_id: usuarioId });
  await validarDatosAcademicos(completo);
  const alumno = await repo.crear(completo);
  if (!alumno) {
    throw errorHttp(500, "ESTATUS_ACTIVO_NO_EXISTE", "No está configurado el estatus académico Activo");
  }
  return alumno;
}

async function obtenerMiPerfil(auth) {
  const alumno = await repo.obtenerPorUsuarioId(idDelToken(auth));
  if (!alumno) {
    throw errorHttp(404, "PERFIL_NO_REGISTRADO", "Todavía no tienes un perfil académico");
  }
  return alumno;
}

async function listar(pagina, limite) {
  return repo.listar(pagina, limite);
}

async function obtener(alumnoId, auth) {
  const alumno = await repo.obtenerPorId(alumnoId);
  if (!alumno) {
    throw errorHttp(404, "ALUMNO_NO_ENCONTRADO", "El alumno no existe");
  }
  if (auth.rol !== "Administrador" && Number(alumno.usuario_id) !== idDelToken(auth)) {
    throw errorHttp(403, "ACCESO_DENEGADO", "No puedes consultar los datos de otro alumno");
  }
  return alumno;
}

async function modificar(alumnoId, cambios, auth) {
  const actual = await obtener(alumnoId, auth);
  const esAdministrador = auth.rol === "Administrador";

  if (!esAdministrador) {
    // El Alumno solo puede cambiar datos personales tras el registro inicial.
    const personales = ["nombre", "apellido_paterno", "apellido_materno", "telefono"];
    if (Object.keys(cambios).some(campo => !personales.includes(campo))) {
      throw errorHttp(403, "CAMPO_NO_PERMITIDO",
        "Solo puedes modificar nombre, apellidos y teléfono");
    }
  }

  await validarDatosAcademicos({ ...actual, ...cambios });
  const propietarioId = esAdministrador ? null : idDelToken(auth);
  const actualizado = await repo.modificar(alumnoId, cambios, propietarioId);
  if (!actualizado) {
    throw errorHttp(404, "ALUMNO_NO_ENCONTRADO", "El alumno no está disponible");
  }
  return actualizado;
}

async function cambiarEstatus(alumnoId, estatus) {
  const alumno = await repo.obtenerPorId(alumnoId);
  if (!alumno) {
    throw errorHttp(404, "ALUMNO_NO_ENCONTRADO", "El alumno no existe");
  }
  const actualizado = await repo.cambiarEstatus(alumnoId, estatus);
  if (!actualizado) {
    throw errorHttp(400, "ESTATUS_INVALIDO", "El estatus indicado no existe en el catálogo");
  }
  return actualizado;
}

module.exports = {
  registrar, registrarMiPerfil, obtenerMiPerfil, listar,
  obtener, modificar, cambiarEstatus
};
