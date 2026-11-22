'use strict';
const { pool } = require('./baseRepository');
const { fallo } = require('../utils/http');
const { consultarIdiomaDeNivel } = require('../integraciones');

// El bloqueo por alumno y periodo evita dos inscripciones concurrentes
// en grupos de distintos idiomas sin pasar por las nuevas validaciones.
async function bloquearAlumnoPeriodo(db, alumnoId, periodoId) {
  await db.query('SELECT pg_advisory_xact_lock($1::int, $2::int)',
    [alumnoId, periodoId]);
}

async function comprobarCompatibilidad(db, datos, grupo, authorization, excluirInscripcionId = null) {
  const otras = await db.query(`
    SELECT i.inscripcion_id, i.semestre_al_inscribirse, g.grupo_id, g.nivel_id
    FROM public.inscripcion i
    JOIN public.grupo g ON g.grupo_id = i.grupo_id
    WHERE i.alumno_id = $1
      AND g.periodo_id = $2
      AND i.estatus <> 'Baja'
      AND ($3::int IS NULL OR i.inscripcion_id <> $3)
    ORDER BY i.inscripcion_id`,
    [datos.alumno_id, grupo.periodo_id, excluirInscripcionId]);
  if (!otras.rows.length) return;

  // Todos los registros vigentes del mismo periodo deben conservar el semestre.
  for (const otra of otras.rows) {
    const anterior = otra.semestre_al_inscribirse;
    const nuevo = datos.semestre_al_inscribirse ?? null;
    if ((anterior == null ? null : Number(anterior)) !== nuevo) {
      throw fallo(409, 'SEMESTRE_INCONSISTENTE',
        `El alumno ya tiene una inscripción en este periodo con semestre ${anterior == null ? 'sin semestre' : anterior}`);
    }
  }

  const idiomaActual = await consultarIdiomaDeNivel(grupo.nivel_id, authorization);
  const cache = new Map([[Number(grupo.nivel_id), idiomaActual]]);
  for (const otra of otras.rows) {
    const nivel = Number(otra.nivel_id);
    if (!cache.has(nivel)) {
      cache.set(nivel, await consultarIdiomaDeNivel(nivel, authorization));
    }
    if (cache.get(nivel) === idiomaActual) {
      throw fallo(409, 'IDIOMA_YA_INSCRITO',
        'El alumno ya tiene una inscripción en este idioma durante el mismo periodo');
    }
  }
}

async function inscribir(datos, authorization) {
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    // El bloqueo de alumno se adquiere antes del bloqueo de grupo.
    // Para conocer periodo_id se lee primero, luego se comprueba nuevamente bajo bloqueo.
    const ref = await db.query('SELECT periodo_id FROM public.grupo WHERE grupo_id=$1', [datos.grupo_id]);
    if (!ref.rows[0]) throw fallo(404, 'GRUPO_NO_ENCONTRADO', 'Grupo inexistente');
    await bloquearAlumnoPeriodo(db, datos.alumno_id, ref.rows[0].periodo_id);
    const grupoRes = await db.query('SELECT * FROM public.grupo WHERE grupo_id=$1 FOR UPDATE', [datos.grupo_id]);
    const grupo = grupoRes.rows[0];
    if (!grupo) throw fallo(404, 'GRUPO_NO_ENCONTRADO', 'Grupo inexistente');
    if (Number(grupo.periodo_id) !== Number(ref.rows[0].periodo_id)) {
      throw fallo(409, 'GRUPO_MODIFICADO', 'El grupo cambió de periodo; vuelve a intentarlo');
    }
    if (grupo.estatus !== 'Activo') throw fallo(409, 'GRUPO_INACTIVO', 'El grupo no está activo');
    if (grupo.fecha_cierre != null) throw fallo(409, 'GRUPO_CERRADO', 'El grupo tiene evaluaciones cerradas');
    const periodo = await db.query('SELECT * FROM public.periodo WHERE periodo_id=$1', [grupo.periodo_id]);
    if (periodo.rows[0]?.fecha_cierre != null) throw fallo(409, 'PERIODO_CERRADO', 'El periodo está cerrado');
    if (periodo.rows[0]?.estatus !== 'Activo') throw fallo(409, 'PERIODO_INACTIVO', 'El periodo no está activo');
    const existente = await db.query('SELECT inscripcion_id FROM public.inscripcion WHERE grupo_id=$1 AND alumno_id=$2', [datos.grupo_id, datos.alumno_id]);
    if (existente.rows.length) throw fallo(409, 'INSCRIPCION_YA_EXISTE', 'Ya existe una inscripción para este alumno en el grupo');

    await comprobarCompatibilidad(db, datos, grupo, authorization);

    const cupos = await db.query("SELECT COUNT(*)::int AS ocupados FROM public.inscripcion WHERE grupo_id=$1 AND estatus IN ('Inscrito','En curso')", [datos.grupo_id]);
    if (cupos.rows[0].ocupados >= grupo.cupo_maximo) throw fallo(409, 'CUPO_AGOTADO', 'El grupo no tiene cupos disponibles');
    const r = await db.query(`INSERT INTO public.inscripcion (alumno_id,grupo_id,semestre_al_inscribirse)
      VALUES ($1,$2,$3) RETURNING *`, [datos.alumno_id,datos.grupo_id,datos.semestre_al_inscribirse]);
    await db.query('COMMIT');
    return r.rows[0];
  } catch(e) {
    await db.query('ROLLBACK');
    throw e;
  } finally { db.release(); }
}

async function cambiarEstatus(inscripcionId, nuevoEstatus, authorization) {
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    const base = await db.query(`
      SELECT i.alumno_id, i.grupo_id, g.periodo_id
      FROM public.inscripcion i
      JOIN public.grupo g ON g.grupo_id = i.grupo_id
      WHERE i.inscripcion_id=$1`, [inscripcionId]);
    if (!base.rows[0]) throw fallo(404, 'INSCRIPCION_NO_ENCONTRADA', 'La inscripción no existe');

    await bloquearAlumnoPeriodo(db, base.rows[0].alumno_id, base.rows[0].periodo_id);
    const grupoResult = await db.query('SELECT * FROM public.grupo WHERE grupo_id=$1 FOR UPDATE', [base.rows[0].grupo_id]);
    const grupo = grupoResult.rows[0];
    if (!grupo) throw fallo(404, 'GRUPO_NO_ENCONTRADO', 'El grupo no existe');
    if (Number(grupo.periodo_id) !== Number(base.rows[0].periodo_id)) {
      throw fallo(409, 'GRUPO_MODIFICADO', 'El grupo cambió de periodo; vuelve a intentarlo');
    }
    const periodoInfo = await db.query('SELECT estatus, fecha_cierre FROM public.periodo WHERE periodo_id=$1', [grupo.periodo_id]);
    if (periodoInfo.rows[0]?.estatus !== 'Activo' || periodoInfo.rows[0]?.fecha_cierre != null || grupo.fecha_cierre != null) {
      throw fallo(409, 'EVALUACIONES_CERRADAS', 'No se puede cambiar el estatus en un grupo o periodo cerrado');
    }
    const inscripcionResult = await db.query('SELECT * FROM public.inscripcion WHERE inscripcion_id=$1 FOR UPDATE', [inscripcionId]);
    const actual = inscripcionResult.rows[0];
    if (!actual) throw fallo(404, 'INSCRIPCION_NO_ENCONTRADA', 'La inscripción no existe');
    if (['Aprobado','Reprobado'].includes(actual.estatus)) {
      throw fallo(409, 'EVALUACION_FINALIZADA', 'Para modificar esta inscripción primero debe reabrirse la evaluación del alumno');
    }
    if (actual.estatus === nuevoEstatus) {
      await db.query('COMMIT');
      return actual;
    }

    if (['Inscrito', 'En curso'].includes(nuevoEstatus) && !['Inscrito', 'En curso'].includes(actual.estatus)) {
      if (grupo.estatus !== 'Activo') throw fallo(409, 'GRUPO_INACTIVO', 'No se puede reactivar: el grupo no está activo');
      await comprobarCompatibilidad(db, actual, grupo, authorization, inscripcionId);
      const cupos = await db.query("SELECT COUNT(*)::int AS ocupados FROM public.inscripcion WHERE grupo_id=$1 AND estatus IN ('Inscrito','En curso')", [grupo.grupo_id]);
      if (cupos.rows[0].ocupados >= grupo.cupo_maximo) throw fallo(409, 'CUPO_AGOTADO', 'No se puede reactivar: el grupo no tiene cupos disponibles');
    }
    const resultado = await db.query('UPDATE public.inscripcion SET estatus=$1 WHERE inscripcion_id=$2 RETURNING *', [nuevoEstatus, inscripcionId]);
    await db.query('COMMIT');
    return resultado.rows[0];
  } catch(e) {
    await db.query('ROLLBACK');
    throw e;
  } finally { db.release(); }
}

module.exports = { inscribir, cambiarEstatus };
