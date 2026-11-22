const { pool } = require("./baseRepository");

// Consulta los resultados almacenados (calificacion_final) y el promedio
// dinámico de la vista. Una evaluación en curso conserva final = null.
// Las condiciones de acceso a grupos del Maestro se aplican EN EL SQL.
async function listar({ pagina, limite, grupo_id = null, periodo_id = null, estatus = null, maestro_id = null }) {
  const condiciones = [];
  const parametros = [];
  const agregar = (columna, valor) => {
    if (valor !== null && valor !== undefined) {
      parametros.push(valor);
      condiciones.push(`${columna} = $${parametros.length}`);
    }
  };

  agregar("i.grupo_id", grupo_id);
  agregar("g.periodo_id", periodo_id);
  agregar("i.estatus", estatus);
  agregar("g.maestro_id", maestro_id);

  const where = condiciones.length ? `WHERE ${condiciones.join(" AND ")}` : "";
  const from = `FROM public.inscripcion i
    JOIN public.grupo g ON g.grupo_id = i.grupo_id`;

  const conteo = await pool.query(
    `SELECT COUNT(*)::int AS total ${from} ${where}`,
    parametros
  );
  const total = Number(conteo.rows[0]?.total || 0);

  const valores = [...parametros, limite, (pagina - 1) * limite];
  const limitePos = parametros.length + 1;
  const offsetPos = parametros.length + 2;
  const filas = await pool.query(
    `SELECT i.inscripcion_id, i.alumno_id, i.grupo_id,
            g.clave_grupo, g.periodo_id,
            i.estatus, i.calificacion_final,
            COALESCE(v.unidades_calificadas, 0)::int AS unidades_calificadas,
            v.promedio_actual
       ${from}
       LEFT JOIN public.vw_promedio_alumnos v
         ON v.inscripcion_id = i.inscripcion_id
       ${where}
       ORDER BY g.periodo_id DESC, g.grupo_id ASC, i.inscripcion_id ASC
       LIMIT $${limitePos} OFFSET $${offsetPos}`,
    valores
  );

  return {
    total,
    calificaciones: filas.rows.map(fila => ({
      inscripcion_id: fila.inscripcion_id,
      alumno_id: fila.alumno_id,
      grupo_id: fila.grupo_id,
      clave_grupo: fila.clave_grupo,
      periodo_id: fila.periodo_id,
      estatus: fila.estatus,
      unidades_calificadas: Number(fila.unidades_calificadas),
      promedio_actual: fila.promedio_actual === null ? null : Number(fila.promedio_actual),
      calificacion_final: fila.calificacion_final === null ? null : Number(fila.calificacion_final),
      evaluacion_finalizada: ["Aprobado", "Reprobado"].includes(fila.estatus)
    }))
  };
}

module.exports = { listar };
