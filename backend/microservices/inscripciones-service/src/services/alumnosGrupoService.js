"use strict";
const { fallo } = require("../utils/http");

// Solo el servicio inscripciones posee la clave compartida. Nunca enviarla desde React.
async function consultarResumenAlumnos(alumnoIds, authorization) {
  if (alumnoIds.length === 0) return [];
  const base = process.env.ACADEMICO_SERVICE_URL;
  const clave = process.env.CLE_INTERNAL_API_KEY;
  if (!base || !clave) {
    throw fallo(503, "SERVICIO_NO_CONFIGURADO", "Faltan ACADEMICO_SERVICE_URL o CLE_INTERNAL_API_KEY");
  }
  let respuesta;
  try {
    const url = `${base.replace(/\/$/, "")}/api/v1/catalogos/resumen-alumnos?ids=${alumnoIds.join(",")}`;
    respuesta = await fetch(url, {
      headers: {
        Authorization: authorization,
        "X-CLE-Internal-Key": clave
      },
      signal: AbortSignal.timeout(4000)
    });
  } catch {
    throw fallo(503, "SERVICIO_NO_DISPONIBLE", "academico-service no respondió a la consulta de alumnos");
  }
  if (respuesta.status === 401) throw fallo(401, "TOKEN_INVALIDO", "Académico rechazó el token");
  if (respuesta.status === 403) throw fallo(403, "ACCESO_DENEGADO", "Académico rechazó la consulta interna");
  if (respuesta.status === 404) throw fallo(502, "ENDPOINT_ACADEMICO_NO_ENCONTRADO", "Falta instalar /api/v1/catalogos/resumen-alumnos en académico");
  if (!respuesta.ok) throw fallo(502, "ERROR_SERVICIO_EXTERNO", `Académico respondió HTTP ${respuesta.status}`);
  let datos;
  try { datos = await respuesta.json(); }
  catch { throw fallo(502, "FORMATO_ACADEMICO_INVALIDO", "La respuesta de académico no es JSON válido"); }
  if (!datos || !Array.isArray(datos.alumnos)) {
    throw fallo(502, "FORMATO_ACADEMICO_INVALIDO", "Académico no devolvió un arreglo de alumnos");
  }
  return datos.alumnos;
}
module.exports = { consultarResumenAlumnos };
