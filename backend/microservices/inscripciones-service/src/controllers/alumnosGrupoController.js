"use strict";
const { id, fallo, handler } = require("../utils/http");
const repo = require("../repositories/baseRepository");
const inscripciones = require("../repositories/alumnosGrupoRepository");
const permisos = require("../services/permisosService");
const { consultarResumenAlumnos } = require("../services/alumnosGrupoService");

const ESTATUS = new Set(["Inscrito", "En curso", "Aprobado", "Reprobado", "Baja"]);
function numeroConsulta(value, defecto, minimo, maximo) {
  if (value === undefined) return defecto;
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    throw fallo(400, "PAGINACION_INVALIDA", "pagina y limite deben ser números enteros");
  }
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < minimo || n > maximo) {
    throw fallo(400, "PAGINACION_INVALIDA", `El valor debe estar entre ${minimo} y ${maximo}`);
  }
  return n;
}

// GET /api/v1/grupos/:id/alumnos
const listar = handler(async (req, res) => {
  const grupoId = id(req.params.id);
  const grupo = await repo.porId("grupo", grupoId);
  if (!grupo) throw fallo(404, "GRUPO_NO_ENCONTRADO", "El grupo no existe");
  await permisos.accesoGrupo(req, grupoId);

  const pagina = numeroConsulta(req.query.pagina, 1, 1, 2147483647);
  const limite = numeroConsulta(req.query.limite, 20, 1, 100);
  const estatus = req.query.estatus ?? null;
  if (estatus !== null && (typeof estatus !== "string" || !ESTATUS.has(estatus))) {
    throw fallo(400, "ESTATUS_INVALIDO", "Estatus de inscripción inválido");
  }

  const { inscripciones: filas, total } = await inscripciones.listarPorGrupo(grupoId, { pagina, limite, estatus });
  const ids = [...new Set(filas.map(f => Number(f.alumno_id)))];
  const perfiles = await consultarResumenAlumnos(ids, req.headers.authorization);
  const perfilesPorId = new Map(perfiles.map(a => [Number(a.alumno_id), a]));

  const alumnos = filas.map(fila => {
    const perfil = perfilesPorId.get(Number(fila.alumno_id));
    return {
      inscripcion_id: fila.inscripcion_id,
      alumno_id: fila.alumno_id,
      grupo_id: fila.grupo_id,
      estatus_inscripcion: fila.estatus_inscripcion,
      fecha_inscripcion: fila.fecha_inscripcion,
      semestre_al_inscribirse: fila.semestre_al_inscribirse,
      nombre: perfil?.nombre ?? null,
      apellido_paterno: perfil?.apellido_paterno ?? null,
      apellido_materno: perfil?.apellido_materno ?? null,
      matricula: perfil?.matricula ?? null,
      tipo_alumno: perfil?.tipo_alumno ?? null,
      carrera: perfil?.carrera ?? null
    };
  });
  res.json({ grupo_id: grupo.grupo_id, clave_grupo: grupo.clave_grupo,
    alumnos, total, pagina, limite });
});
module.exports = { listar };
