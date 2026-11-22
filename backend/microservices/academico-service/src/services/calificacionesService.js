const { fallo } = require("../utils/http");
const { pool } = require("../repositories/baseRepository");
const cierre = require("./cierreService");

// La vista de PostgreSQL calcula AVG(calificacion): cuenta las notas 0
// y no incluye unidades sin registro. calificacion_final NO se actualiza.
async function obtenerPromedio(inscripcionId, db = pool) {
  const consulta = await db.query(
    `SELECT unidades_calificadas, promedio_actual
       FROM public.vw_promedio_alumnos
      WHERE inscripcion_id = $1`,
    [inscripcionId]
  );
  if (!consulta.rows[0]) {
    throw fallo(404, "INSCRIPCION_NO_ENCONTRADA", "No existe el promedio de la inscripción");
  }
  const { unidades_calificadas, promedio_actual } = consulta.rows[0];
  return {
    unidades_calificadas: Number(unidades_calificadas),
    promedio_actual: promedio_actual === null ? null : Number(promedio_actual)
  };
}

// Inserta o reemplaza una nota. La restricción UNIQUE en PostgreSQL
// (inscripcion_id, numero_unidad) evita duplicados incluso con concurrencia.
async function registrarCalificacion(inscripcionId, datos) {
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    const ref = await db.query(
      'SELECT grupo_id FROM public.inscripcion WHERE inscripcion_id=$1',
      [inscripcionId]
    );
    if (!ref.rows[0]) throw fallo(404, 'INSCRIPCION_NO_ENCONTRADA', 'Inscripción inexistente');
    // Bloqueos en el orden periodo -> grupo -> inscripción, también usado en cierres.
    const { grupo, periodo } = await cierre.cargarGrupo(db, ref.rows[0].grupo_id);
    cierre.validarAbierto(grupo, periodo);
    const bloqueada = await db.query(
      'SELECT inscripcion_id, estatus FROM public.inscripcion WHERE inscripcion_id=$1 FOR UPDATE',
      [inscripcionId]
    );
    const actual = bloqueada.rows[0];
    if (!actual) throw fallo(404, 'INSCRIPCION_NO_ENCONTRADA', 'Inscripción inexistente');
    if (!['Inscrito','En curso'].includes(actual.estatus)) {
      throw fallo(409, 'INSCRIPCION_NO_CALIFICABLE',
        'Solo pueden calificarse inscripciones Inscrito o En curso');
    }
    const guardada = await db.query(
      `INSERT INTO public.calificacion_unidad
         (inscripcion_id, numero_unidad, calificacion, registrado_por)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (inscripcion_id, numero_unidad)
       DO UPDATE SET calificacion = EXCLUDED.calificacion,
                     registrado_por = EXCLUDED.registrado_por,
                     fecha_registro = CURRENT_TIMESTAMP
       RETURNING *`,
      [inscripcionId, datos.numero_unidad, datos.calificacion, datos.registrado_por]
    );
    const promedio = await obtenerPromedio(inscripcionId, db);
    await db.query('COMMIT');
    return { inscripcion_id: inscripcionId, calificacion: guardada.rows[0], ...promedio };
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  } finally { db.release(); }
}

async function listarCalificaciones(inscripcion) {
  const r = await pool.query(
    `SELECT calificacion_id, inscripcion_id, numero_unidad, calificacion,
            fecha_registro, registrado_por
       FROM public.calificacion_unidad
      WHERE inscripcion_id = $1
      ORDER BY numero_unidad`,
    [inscripcion.inscripcion_id]
  );
  const casillas = Object.fromEntries(
    Array.from({ length: 10 }, (_, index) => [`U${index + 1}`, null])
  );
  for (const registro of r.rows) {
    // Conserva 0 como cero, no como una casilla vacía.
    casillas[`U${registro.numero_unidad}`] = Number(registro.calificacion);
  }
  const promedio = await obtenerPromedio(inscripcion.inscripcion_id);
  return {
    inscripcion_id: inscripcion.inscripcion_id,
    calificaciones: casillas,
    ...promedio,
    calificacion_final_guardada: inscripcion.calificacion_final == null
      ? null : Number(inscripcion.calificacion_final)
  };
}

async function consultarCalificacionFinal(inscripcion) {
  const { promedio_actual, unidades_calificadas } = await obtenerPromedio(inscripcion.inscripcion_id);
  const cerrada = ['Aprobado', 'Reprobado'].includes(inscripcion.estatus);
  const finalGuardada = inscripcion.calificacion_final == null
    ? null : Number(inscripcion.calificacion_final);
  return {
    inscripcion_id: inscripcion.inscripcion_id,
    calificacion_final: cerrada ? finalGuardada : promedio_actual,
    promedio_actual,
    unidades_calificadas,
    evaluacion_finalizada: cerrada
  };
}

module.exports = {
  obtenerPromedio,
  registrarCalificacion,
  listarCalificaciones,
  consultarCalificacionFinal
};
