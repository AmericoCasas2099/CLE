const { fallo } = require("./utils/http");

async function consultar(base, ruta, token) {
  if (!base) throw fallo(503, "SERVICIO_NO_CONFIGURADO", "URL de microservicio no configurada");
  let r;
  try {
    r = await fetch(`${base.replace(/\/$/, "")}${ruta}`, {
      headers: { Authorization: token }, signal: AbortSignal.timeout(4000)
    });
  } catch {
    throw fallo(503, "SERVICIO_NO_DISPONIBLE", "El microservicio externo no responde");
  }
  if (r.status === 404) throw fallo(400, "REFERENCIA_NO_EXISTE", `Referencia externa no encontrada: ${ruta}`);
  if (r.status === 403) throw fallo(403, "ACCESO_DENEGADO", "No estás autorizado para consultar el recurso externo");
  if (r.status === 401) throw fallo(401, "TOKEN_INVALIDO", "El servicio externo rechazó la sesión");
  if (!r.ok) throw fallo(502, "ERROR_SERVICIO_EXTERNO", `No se pudo consultar ${ruta} (HTTP ${r.status})`);
  return r.json();
}
// Identifica al Maestro autenticado usando su perfil en academico-service.
// Nunca se recibe maestro_id del cliente: se deriva del JWT remitido.
async function consultarMiPerfilMaestro(authorization) {
  const base = process.env.ACADEMICO_SERVICE_URL;
  if (!base) throw fallo(503, "SERVICIO_NO_CONFIGURADO", "URL de academico-service no configurada");
  let r;
  try {
    r = await fetch(`${base.replace(/\/$/, "")}/api/v1/maestros/mi-perfil`, {
      headers: { Authorization: authorization },
      signal: AbortSignal.timeout(4000)
    });
  } catch {
    throw fallo(503, "SERVICIO_NO_DISPONIBLE", "academico-service no responde");
  }
  if (r.status === 404) {
    throw fallo(404, "PERFIL_NO_REGISTRADO", "Debes registrar tu perfil de Maestro primero");
  }
  if (r.status === 401) throw fallo(401, "TOKEN_INVALIDO", "Académico rechazó la sesión");
  if (r.status === 403) throw fallo(403, "ACCESO_DENEGADO", "No tienes acceso al perfil de Maestro");
  if (!r.ok) throw fallo(502, "ERROR_SERVICIO_EXTERNO", `Académico respondió HTTP ${r.status}`);
  let json;
  try { json = await r.json(); } catch {
    throw fallo(502, "FORMATO_ACADEMICO_INVALIDO", "La respuesta académica no es JSON válido");
  }
  const maestro = json.maestro || json;
  if (!Number.isSafeInteger(Number(maestro.maestro_id)) || Number(maestro.maestro_id) <= 0 ||
      !Number.isSafeInteger(Number(maestro.usuario_id)) || Number(maestro.usuario_id) <= 0) {
    throw fallo(502, "FORMATO_ACADEMICO_INVALIDO", "Académico no devolvió un perfil válido");
  }
  return maestro;
}

async function validarMaestro(maestroId, authorization) {
  const j = await consultar(process.env.ACADEMICO_SERVICE_URL, `/api/v1/maestros/${maestroId}`, authorization);
  return j.maestro || j;
}
async function validarAlumno(alumnoId, authorization) {
  const j = await consultar(process.env.ACADEMICO_SERVICE_URL, `/api/v1/alumnos/${alumnoId}`, authorization);
  return j.alumno || j;
}
async function validarCampus(campusId, authorization) {
  const j = await consultar(process.env.INFRAESTRUCTURA_SERVICE_URL, `/api/v1/campus/${campusId}`, authorization);
  return j.campus || j;
}
async function validarSalon(salonId, authorization) {
  const j = await consultar(process.env.INFRAESTRUCTURA_SERVICE_URL, `/api/v1/salones/${salonId}`, authorization);
  return j.salon || j;
}
module.exports = {
  validarMaestro, validarAlumno, validarCampus, validarSalon, consultarMiPerfilMaestro
};
