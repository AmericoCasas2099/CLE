"use strict";
const { pool } = require("./baseRepository");

// Una consulta por grupo; el LEFT JOIN incluye alumnos sin notas.
// El promedio viene exclusivamente de la vista oficial de PostgreSQL.
async function listarPorGrupo(grupoId, db = pool) {
  const consulta = await db.query(
    `SELECT i.inscripcion_id, i.alumno_id, i.grupo_id, i.estatus,
            i.calificacion_final,
            v.unidades_calificadas, v.promedio_actual,
            c.numero_unidad, c.calificacion
       FROM public.inscripcion i
       LEFT JOIN public.calificacion_unidad c
         ON c.inscripcion_id = i.inscripcion_id
       LEFT JOIN public.vw_promedio_alumnos v
         ON v.inscripcion_id = i.inscripcion_id
      WHERE i.grupo_id = $1
      ORDER BY i.inscripcion_id, c.numero_unidad`,
    [grupoId]
  );

  const alumnos = new Map();
  for (const fila of consulta.rows) {
    const clave = Number(fila.inscripcion_id);
    let alumno = alumnos.get(clave);
    if (!alumno) {
      alumno = {
        inscripcion_id: fila.inscripcion_id,
        alumno_id: fila.alumno_id,
        estatus: fila.estatus,
        calificaciones: Object.fromEntries(
          Array.from({ length: 10 }, (_, indice) => [`U${indice + 1}`, null])
        ),
        unidades_calificadas: Number(fila.unidades_calificadas ?? 0),
        promedio_actual: fila.promedio_actual == null ? null : Number(fila.promedio_actual),
        calificacion_final: fila.calificacion_final == null ? null : Number(fila.calificacion_final)
      };
      alumnos.set(clave, alumno);
    }
    if (fila.numero_unidad != null) {
      const numero = Number(fila.numero_unidad);
      // No inventa ni expone una casilla fuera de la plantilla oficial U1-U10.
      if (Number.isInteger(numero) && numero >= 1 && numero <= 10) {
        alumno.calificaciones[`U${numero}`] = fila.calificacion == null
          ? null : Number(fila.calificacion);
      }
    }
  }
  return [...alumnos.values()];
}

module.exports = { listarPorGrupo };
