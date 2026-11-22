"use strict";
const { id, fallo, handler } = require("../utils/http");
const repo = require("../repositories/baseRepository");
const calificacionesGrupo = require("../repositories/calificacionesGrupoRepository");
const permisos = require("../services/permisosService");

// GET /api/v1/grupos/:id/calificaciones
// Administrador: cualquier grupo; Maestro: únicamente sus grupos.
const listar = handler(async (req, res) => {
  const grupoId = id(req.params.id);
  const grupo = await repo.porId("grupo", grupoId);
  if (!grupo) {
    throw fallo(404, "GRUPO_NO_ENCONTRADO", "El grupo no existe");
  }
  await permisos.accesoGrupo(req, grupoId);
  const alumnos = await calificacionesGrupo.listarPorGrupo(grupoId);
  res.json({
    grupo_id: grupo.grupo_id,
    clave_grupo: grupo.clave_grupo,
    periodo_id: grupo.periodo_id,
    alumnos,
    total: alumnos.length
  });
});

module.exports = { listar };
