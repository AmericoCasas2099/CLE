const {pool}=require("./baseRepository");
const {fallo}=require("../utils/http");
// SERIALIZACIÓN POR GRUPO: evita sobrecupo bajo solicitudes concurrentes.
async function inscribir(datos) {
  const db=await pool.connect();
  try {
    await db.query("BEGIN");
    const grupoRes=await db.query("SELECT * FROM public.grupo WHERE grupo_id=$1 FOR UPDATE",[datos.grupo_id]);
    const grupo=grupoRes.rows[0];
    if(!grupo)throw fallo(404,"GRUPO_NO_ENCONTRADO","Grupo inexistente");
    if(grupo.estatus!=="Activo")throw fallo(409,"GRUPO_INACTIVO","El grupo no está activo");
    if(grupo.fecha_cierre != null)throw fallo(409,"GRUPO_CERRADO","El grupo tiene evaluaciones cerradas");
    const periodo=await db.query("SELECT * FROM public.periodo WHERE periodo_id=$1",[grupo.periodo_id]);
    if(periodo.rows[0]?.fecha_cierre != null)throw fallo(409,"PERIODO_CERRADO","El periodo está cerrado");
    if(periodo.rows[0]?.estatus!=="Activo")throw fallo(409,"PERIODO_INACTIVO","El periodo no está activo");
    const existente=await db.query("SELECT * FROM public.inscripcion WHERE grupo_id=$1 AND alumno_id=$2",[datos.grupo_id,datos.alumno_id]);
    if(existente.rows.length)throw fallo(409,"INSCRIPCION_YA_EXISTE","Ya existe una inscripción para este alumno en el grupo");
    const cupos=await db.query("SELECT COUNT(*)::int AS ocupados FROM public.inscripcion WHERE grupo_id=$1 AND estatus IN ('Inscrito','En curso')",[datos.grupo_id]);
    if(cupos.rows[0].ocupados>=grupo.cupo_maximo)throw fallo(409,"CUPO_AGOTADO","El grupo no tiene cupos disponibles");
    const r=await db.query(`INSERT INTO public.inscripcion (alumno_id,grupo_id,semestre_al_inscribirse)
      VALUES ($1,$2,$3) RETURNING *`,[datos.alumno_id,datos.grupo_id,datos.semestre_al_inscribirse]);
    await db.query("COMMIT");return r.rows[0];
  } catch(e){await db.query("ROLLBACK");throw e;}finally{db.release();}
}
// Reactivación serializada con POST /inscripciones para no sobrepasar el cupo.
// Se bloquea primero el grupo y después la inscripción, en el mismo orden
// de bloqueo que usa inscribir().
async function cambiarEstatus(inscripcionId, nuevoEstatus) {
  const db = await pool.connect();
  try {
    await db.query("BEGIN");

    // Identificar el grupo al que pertenece la inscripción.
    const base = await db.query(
      "SELECT grupo_id FROM public.inscripcion WHERE inscripcion_id=$1",
      [inscripcionId]
    );
    if (!base.rows.length) {
      throw fallo(404, "INSCRIPCION_NO_ENCONTRADA", "La inscripción no existe");
    }

    // El bloqueo de grupo serializa registros y reactivaciones concurrentes.
    const grupoResult = await db.query(
      "SELECT * FROM public.grupo WHERE grupo_id=$1 FOR UPDATE",
      [base.rows[0].grupo_id]
    );
    const grupo = grupoResult.rows[0];
    if (!grupo) {
      throw fallo(404, "GRUPO_NO_ENCONTRADO", "El grupo no existe");
    }

    const periodoInfo = await db.query('SELECT estatus, fecha_cierre FROM public.periodo WHERE periodo_id=$1', [grupo.periodo_id]);
    if (periodoInfo.rows[0]?.estatus !== 'Activo' || periodoInfo.rows[0]?.fecha_cierre != null || grupo.fecha_cierre != null) {
      throw fallo(409,'EVALUACIONES_CERRADAS','No se puede cambiar el estatus en un grupo o periodo cerrado');
    }
    const inscripcionResult = await db.query(
      "SELECT * FROM public.inscripcion WHERE inscripcion_id=$1 FOR UPDATE",
      [inscripcionId]
    );
    const actual = inscripcionResult.rows[0];
    if (!actual) {
      throw fallo(404, "INSCRIPCION_NO_ENCONTRADA", "La inscripción no existe");
    }

    if (['Aprobado','Reprobado'].includes(actual.estatus)) {
      throw fallo(409,'EVALUACION_FINALIZADA','Para modificar esta inscripción primero debe reabrirse la evaluación del alumno');
    }
    if (actual.estatus === nuevoEstatus) {
      await db.query("COMMIT");
      return actual;
    }

    // Solo una reactivación ocupa un nuevo cupo. No se borra historial
    // ni calificaciones cuando se cambia de estatus.
    if (["Inscrito", "En curso"].includes(nuevoEstatus) &&
        !["Inscrito", "En curso"].includes(actual.estatus)) {
      if (grupo.estatus !== "Activo") {
        throw fallo(409, "GRUPO_INACTIVO", "No se puede reactivar: el grupo no está activo");
      }
      const periodoResult = await db.query(
        "SELECT estatus FROM public.periodo WHERE periodo_id=$1",
        [grupo.periodo_id]
      );
      if (periodoResult.rows[0]?.estatus !== "Activo") {
        throw fallo(409, "PERIODO_INACTIVO", "No se puede reactivar: el periodo no está activo");
      }
      const cupos = await db.query(
        "SELECT COUNT(*)::int AS ocupados FROM public.inscripcion WHERE grupo_id=$1 AND estatus IN ('Inscrito','En curso')",
        [grupo.grupo_id]
      );
      if (cupos.rows[0].ocupados >= grupo.cupo_maximo) {
        throw fallo(409, "CUPO_AGOTADO", "No se puede reactivar: el grupo no tiene cupos disponibles");
      }
    }

    const resultado = await db.query(
      "UPDATE public.inscripcion SET estatus=$1 WHERE inscripcion_id=$2 RETURNING *",
      [nuevoEstatus, inscripcionId]
    );
    await db.query("COMMIT");
    return resultado.rows[0];
  } catch (e) {
    await db.query("ROLLBACK");
    throw e;
  } finally {
    db.release();
  }
}

module.exports = { inscribir, cambiarEstatus };
