const repo = require("../repositories/baseRepository");
const insRepo = require("../repositories/inscripcionRepository");
const permisos = require("../services/permisosService");
const reglas = require("../services/reglasService");
const calificaciones = require("../services/calificacionesService");
const { schemas, inscripcionStatus, paginacion } = require("../validators/schemas");
const { id, parse, fallo, handler } = require("../utils/http");

const ESTATUS_INSCRIPCION = ["Inscrito", "En curso", "Aprobado", "Reprobado", "Baja"];

const registrar = handler(async (req, res) => {
  const datos = parse(schemas.inscripcion, req.body);
  await permisos.accesoGrupo(req, datos.grupo_id);
  await reglas.validarInscripcion(datos, req.headers.authorization);
  const x = await insRepo.inscribir(datos);
  res.status(201).json({ inscripcion: x });
});

const listar = handler(async (req, res) => {
  const { pagina, limite } = parse(paginacion, {
    pagina: req.query.pagina, limite: req.query.limite
  });
  const filtros = {};
  if (req.query.grupo_id) filtros.grupo_id = id(req.query.grupo_id);
  if (req.query.alumno_id) filtros.alumno_id = id(req.query.alumno_id);
  if (req.query.estatus) {
    if (!ESTATUS_INSCRIPCION.includes(req.query.estatus)) {
      throw fallo(400, "ESTATUS_INVALIDO", "Estatus inválido");
    }
    filtros.estatus = req.query.estatus;
  }
  if (req.auth.rol === "Maestro") {
    if (!filtros.grupo_id) {
      throw fallo(400, "GRUPO_REQUERIDO", "El maestro debe filtrar por grupo_id");
    }
    await permisos.accesoGrupo(req, filtros.grupo_id);
  }
  const d = await repo.listar("inscripcion", { pagina, limite, filtros });
  res.json({ inscripciones: d.datos, total: d.total, pagina, limite });
});

const obtener = handler(async (req, res) => {
  const i = await permisos.accesoInscripcion(req, id(req.params.id));
  res.json({ inscripcion: i });
});

const cambiarEstatus = handler(async (req, res) => {
  const i = await permisos.accesoInscripcion(req, id(req.params.id));
  const { estatus } = parse(inscripcionStatus, req.body);
  if (!['Inscrito', 'En curso', 'Baja'].includes(estatus)) {
    throw fallo(400, 'ESTATUS_NO_PERMITIDO', 'Aprobado y Reprobado solo se asignan mediante finalización');
  }
  const actualizada = await insRepo.cambiarEstatus(i.inscripcion_id, estatus);
  res.json({ inscripcion: actualizada });
});

// Solo Maestro asignado, comprobado en la ruta y permisos.accesoInscripcion().
const registrarCalificacion = handler(async (req, res) => {
  const i = await permisos.accesoInscripcion(req, id(req.params.id));
  const datos = parse(schemas.calificacion_unidad, req.body);
  const resultado = await calificaciones.registrarCalificacion(i.inscripcion_id, {
    numero_unidad: datos.numero_unidad,
    calificacion: datos.calificacion,
    registrado_por: Number(req.auth.sub)
  });
  res.json(resultado);
});

const listarCalificaciones = handler(async (req, res) => {
  const i = await permisos.accesoInscripcion(req, id(req.params.id));
  res.json(await calificaciones.listarCalificaciones(i));
});

// Consulta de solo lectura sobre vw_promedio_alumnos.
const consultarCalificacionFinal = handler(async (req, res) => {
  const i = await permisos.accesoInscripcion(req, id(req.params.id));
  res.json(await calificaciones.consultarCalificacionFinal(i));
});

module.exports = {
  registrar, listar, obtener, cambiarEstatus,
  registrarCalificacion, listarCalificaciones, consultarCalificacionFinal
};
