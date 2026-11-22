"use strict";
const { pool } = require("./baseRepository");

// Incluye Baja de forma predeterminada: el filtro por estatus es opcional.
async function listarPorGrupo(grupoId, { pagina = 1, limite = 20, estatus = null } = {}, db = pool) {
  const filtros = [grupoId];
  let condicion = "i.grupo_id = $1";
  if (estatus !== null) {
    filtros.push(estatus);
    condicion += ` AND i.estatus = $${filtros.length}`;
  }
  const totalRes = await db.query(
    `SELECT COUNT(*)::int AS total FROM public.inscripcion i WHERE ${condicion}`,
    filtros
  );
  const resultado = await db.query(
    `SELECT i.inscripcion_id, i.alumno_id, i.grupo_id,
            i.estatus AS estatus_inscripcion, i.fecha_inscripcion,
            i.semestre_al_inscribirse
       FROM public.inscripcion i
      WHERE ${condicion}
      ORDER BY i.inscripcion_id ASC
      LIMIT $${filtros.length + 1} OFFSET $${filtros.length + 2}`,
    [...filtros, limite, (pagina - 1) * limite]
  );
  return { inscripciones: resultado.rows, total: Number(totalRes.rows[0].total) };
}
module.exports = { listarPorGrupo };
