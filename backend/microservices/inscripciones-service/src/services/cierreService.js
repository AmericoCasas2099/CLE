
'use strict';

const { pool } = require('../repositories/baseRepository');
const { fallo } = require('../utils/http');

const NOTA_MINIMA = 70;
const ESTADOS_PENDIENTES = ['Inscrito', 'En curso'];

// Ejecutar operaciones dentro de una transacción.
async function transaccion(fn) {
    const db = await pool.connect();

    try {
        await db.query('BEGIN');

        const resultado = await fn(db);

        await db.query('COMMIT');

        return resultado;
    } catch (error) {
        await db.query('ROLLBACK');
        throw error;
    } finally {
        db.release();
    }
}

// Consultar y bloquear un periodo.
async function cargarPeriodo(db, periodoId) {
    const r = await db.query(
        `SELECT *
         FROM public.periodo
         WHERE periodo_id = $1
         FOR UPDATE`,
        [periodoId]
    );

    if (!r.rows[0]) {
        throw fallo(
            404,
            'PERIODO_NO_ENCONTRADO',
            'El periodo no existe'
        );
    }

    return r.rows[0];
}

// Consultar grupo y bloquear primero su periodo.
async function cargarGrupo(db, grupoId) {
    const ref = await db.query(
        `SELECT periodo_id
         FROM public.grupo
         WHERE grupo_id = $1`,
        [grupoId]
    );

    if (!ref.rows[0]) {
        throw fallo(
            404,
            'GRUPO_NO_ENCONTRADO',
            'El grupo no existe'
        );
    }

    const periodo = await cargarPeriodo(
        db,
        ref.rows[0].periodo_id
    );

    const r = await db.query(
        `SELECT *
         FROM public.grupo
         WHERE grupo_id = $1
         FOR UPDATE`,
        [grupoId]
    );

    if (!r.rows[0]) {
        throw fallo(
            404,
            'GRUPO_NO_ENCONTRADO',
            'El grupo no existe'
        );
    }

    if (
        Number(r.rows[0].periodo_id) !==
        Number(periodo.periodo_id)
    ) {
        throw fallo(
            409,
            'GRUPO_MODIFICADO',
            'El grupo cambió de periodo; vuelve a intentarlo'
        );
    }

    return {
        grupo: r.rows[0],
        periodo
    };
}

// Comprobar que se puedan modificar evaluaciones.
function validarAbierto(grupo, periodo) {
    if (
        periodo.estatus !== 'Activo' ||
        periodo.fecha_cierre != null
    ) {
        throw fallo(
            409,
            'PERIODO_CERRADO',
            'El periodo no está abierto'
        );
    }

    if (
        grupo.estatus !== 'Activo' ||
        grupo.fecha_cierre != null
    ) {
        throw fallo(
            409,
            'GRUPO_CERRADO',
            'El grupo no permite modificar evaluaciones'
        );
    }
}

// Finalizar inscripciones pendientes.
// La vista calcula AVG() de las notas registradas.
// Si no hay calificaciones, se guarda 0 y Reprobado.
async function finalizarPendientes(db, where, params) {
    const r = await db.query(
        `UPDATE public.inscripcion AS i
         SET
             calificacion_final = COALESCE(
                 v.promedio_actual, 0
             ),
             estatus = CASE
                 WHEN COALESCE(
                     v.promedio_actual, 0
                 ) >= ${NOTA_MINIMA}
                 THEN 'Aprobado'
                 ELSE 'Reprobado'
             END
         FROM public.vw_promedio_alumnos AS v
         WHERE v.inscripcion_id = i.inscripcion_id
           AND i.estatus IN ('Inscrito', 'En curso')
           AND ${where}
         RETURNING
             i.inscripcion_id,
             i.alumno_id,
             i.grupo_id,
             i.estatus,
             i.calificacion_final`,
        params
    );

    return r.rows;
}

// FINALIZAR ALUMNO
async function finalizarAlumno(inscripcionId) {
    return transaccion(async db => {
        const ref = await db.query(
            `SELECT grupo_id
             FROM public.inscripcion
             WHERE inscripcion_id = $1`,
            [inscripcionId]
        );

        if (!ref.rows[0]) {
            throw fallo(
                404,
                'INSCRIPCION_NO_ENCONTRADA',
                'La inscripción no existe'
            );
        }

        const { grupo, periodo } = await cargarGrupo(
            db,
            ref.rows[0].grupo_id
        );

        validarAbierto(grupo, periodo);

        const r = await db.query(
            `SELECT *
             FROM public.inscripcion
             WHERE inscripcion_id = $1
             FOR UPDATE`,
            [inscripcionId]
        );

        const actual = r.rows[0];

        if (!actual) {
            throw fallo(
                404,
                'INSCRIPCION_NO_ENCONTRADA',
                'La inscripción no existe'
            );
        }

        if (!ESTADOS_PENDIENTES.includes(actual.estatus)) {
            throw fallo(
                409,
                'EVALUACION_NO_FINALIZABLE',
                'Solo pueden finalizarse inscripciones Inscrito o En curso'
            );
        }

        const resultado = await finalizarPendientes(
            db,
            'i.inscripcion_id = $1',
            [inscripcionId]
        );

        if (resultado.length !== 1) {
            throw fallo(
                409,
                'CIERRE_INCOMPLETO',
                'No se pudo finalizar la inscripción'
            );
        }

        return {
            inscripcion: resultado[0]
        };
    });
}

// REABRIR ALUMNO
async function reabrirAlumno(inscripcionId) {
    return transaccion(async db => {
        const ref = await db.query(
            `SELECT grupo_id
             FROM public.inscripcion
             WHERE inscripcion_id = $1`,
            [inscripcionId]
        );

        if (!ref.rows[0]) {
            throw fallo(
                404,
                'INSCRIPCION_NO_ENCONTRADA',
                'La inscripción no existe'
            );
        }

        const { grupo, periodo } = await cargarGrupo(
            db,
            ref.rows[0].grupo_id
        );

        validarAbierto(grupo, periodo);

        const r = await db.query(
            `SELECT *
             FROM public.inscripcion
             WHERE inscripcion_id = $1
             FOR UPDATE`,
            [inscripcionId]
        );

        if (
            !['Aprobado', 'Reprobado'].includes(
                r.rows[0]?.estatus
            )
        ) {
            throw fallo(
                409,
                'EVALUACION_NO_FINALIZADA',
                'Solo se pueden reabrir evaluaciones aprobadas o reprobadas'
            );
        }

        const cupos = await db.query(
            `SELECT COUNT(*)::int AS usados
             FROM public.inscripcion
             WHERE grupo_id = $1
               AND estatus IN ('Inscrito', 'En curso')`,
            [grupo.grupo_id]
        );

        if (cupos.rows[0].usados >= grupo.cupo_maximo) {
            throw fallo(
                409,
                'CUPO_AGOTADO',
                'No hay cupo para reabrir esta inscripción'
            );
        }

        const cambiado = await db.query(
            `UPDATE public.inscripcion
             SET
                 estatus = 'En curso',
                 calificacion_final = NULL
             WHERE inscripcion_id = $1
             RETURNING *`,
            [inscripcionId]
        );

        return {
            inscripcion: cambiado.rows[0]
        };
    });
}

// FINALIZAR GRUPO
async function finalizarGrupo(grupoId) {
    return transaccion(async db => {
        const { grupo, periodo } = await cargarGrupo(
            db,
            grupoId
        );

        validarAbierto(grupo, periodo);

        const inscripciones = await finalizarPendientes(
            db,
            'i.grupo_id = $1',
            [grupoId]
        );

        const cierre = await db.query(
            `UPDATE public.grupo
             SET fecha_cierre = NOW()
             WHERE grupo_id = $1
             RETURNING *`,
            [grupoId]
        );

        return {
            grupo: cierre.rows[0],
            procesadas: inscripciones.length,
            resultados: inscripciones
        };
    });
}

// REABRIR GRUPO
async function reabrirGrupo(grupoId) {
    return transaccion(async db => {
        const { grupo, periodo } = await cargarGrupo(
            db,
            grupoId
        );

        if (
            periodo.estatus !== 'Activo' ||
            periodo.fecha_cierre != null
        ) {
            throw fallo(
                409,
                'PERIODO_CERRADO',
                'Primero debe reabrirse el periodo'
            );
        }

        if (grupo.estatus !== 'Activo') {
            throw fallo(
                409,
                'GRUPO_INACTIVO',
                'El grupo está inactivo'
            );
        }

        if (grupo.fecha_cierre == null) {
            throw fallo(
                409,
                'GRUPO_ABIERTO',
                'El grupo ya está abierto'
            );
        }

        const r = await db.query(
            `UPDATE public.grupo
             SET fecha_cierre = NULL
             WHERE grupo_id = $1
             RETURNING *`,
            [grupoId]
        );

        return {
            grupo: r.rows[0],
            mensaje:
                'Grupo reabierto; los resultados individuales se conservaron'
        };
    });
}

// CAMBIAR ESTATUS DEL PERIODO
async function cambiarEstatusPeriodo(periodoId, estatusNuevo) {
    return transaccion(async db => {
        const periodo = await cargarPeriodo(
            db,
            periodoId
        );

        // FINALIZAR PERIODO
        if (estatusNuevo === 'Inactivo') {

            // Si ya estaba finalizado, no recalcular.
            if (periodo.fecha_cierre != null) {
                return {
                    periodo,
                    procesadas: 0,
                    resultados: [],
                    mensaje: 'El periodo ya estaba finalizado'
                };
            }

            // 1. Bloquear todos los grupos del periodo.
            await db.query(
                `SELECT grupo_id
                 FROM public.grupo
                 WHERE periodo_id = $1
                 ORDER BY grupo_id
                 FOR UPDATE`,
                [periodoId]
            );

            // 2. Finalizar las inscripciones pendientes.
            const inscripciones = await finalizarPendientes(
                db,
                `i.grupo_id IN (
                    SELECT grupo_id
                    FROM public.grupo
                    WHERE periodo_id = $1
                )`,
                [periodoId]
            );

            // 3. NUEVO: cerrar todos los grupos del periodo.
            // Se conservan las fechas de grupos cerrados antes.
            const grupos = await db.query(
                `UPDATE public.grupo
                 SET fecha_cierre = COALESCE(
                     fecha_cierre,
                     NOW()
                 )
                 WHERE periodo_id = $1
                 RETURNING grupo_id, clave_grupo, fecha_cierre`,
                [periodoId]
            );

            // 4. Finalizar el periodo.
            const cierre = await db.query(
                `UPDATE public.periodo
                 SET
                     estatus = 'Inactivo',
                     fecha_cierre = NOW()
                 WHERE periodo_id = $1
                 RETURNING *`,
                [periodoId]
            );

            return {
                periodo: cierre.rows[0],
                grupos_cerrados: grupos.rows.length,
                procesadas: inscripciones.length,
                resultados: inscripciones,
                grupos: grupos.rows,
                mensaje:
                    'Periodo finalizado correctamente'
            };
        }

        // REABRIR PERIODO
        if (estatusNuevo === 'Activo') {

            if (
                periodo.fecha_cierre != null &&
                process.env.PERMITIR_REAPERTURA_PERIODOS !== 'true'
            ) {
                throw fallo(
                    403,
                    'REAPERTURA_DESHABILITADA',
                    'La reapertura de periodos está deshabilitada'
                );
            }

            // 1. Bloquear todos los grupos del periodo.
            await db.query(
                `SELECT grupo_id
                 FROM public.grupo
                 WHERE periodo_id = $1
                 ORDER BY grupo_id
                 FOR UPDATE`,
                [periodoId]
            );

            // 2. NUEVO: reabrir todos los grupos.
            // No se modifican inscripciones ni calificaciones.
            const grupos = await db.query(
                `UPDATE public.grupo
                 SET fecha_cierre = NULL
                 WHERE periodo_id = $1
                 RETURNING grupo_id, clave_grupo, fecha_cierre`,
                [periodoId]
            );

            // 3. Reabrir el periodo.
            const reapertura = await db.query(
                `UPDATE public.periodo
                 SET
                     estatus = 'Activo',
                     fecha_cierre = NULL
                 WHERE periodo_id = $1
                 RETURNING *`,
                [periodoId]
            );

            return {
                periodo: reapertura.rows[0],
                grupos_reabiertos: grupos.rows.length,
                grupos: grupos.rows,
                mensaje:
                    'Periodo reabierto; los resultados individuales se conservaron'
            };
        }

        throw fallo(
            400,
            'ESTATUS_INVALIDO',
            'Estatus inválido'
        );
    });
}

module.exports = {
    finalizarAlumno,
    reabrirAlumno,
    finalizarGrupo,
    reabrirGrupo,
    cambiarEstatusPeriodo,
    validarAbierto,
    cargarGrupo
};
