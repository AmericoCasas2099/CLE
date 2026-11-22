
const { fallo } = require("../utils/http");
const repo = require("../repositories/baseRepository");

const {
    validarMaestro,
    validarCampus,
    validarSalon,
    validarAlumno
} = require("../integraciones");

const DIAS_PERMITIDOS = [
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado"
];

const HORA_MINIMA = 7 * 3600;
const HORA_MAXIMA = 21 * 3600;

const segundos = (hora) => {
    const [h, m, s = 0] = hora.split(":").map(Number);
    return h * 3600 + m * 60 + s;
};

// VALIDACIÓN DE PERIODOS
async function validarPeriodo(periodo) {
    if (
        periodo.fecha_inicio &&
        periodo.fecha_fin &&
        periodo.fecha_fin < periodo.fecha_inicio
    ) {
        throw fallo(
            400,
            "FECHAS_INVALIDAS",
            "fecha_fin debe ser posterior a fecha_inicio"
        );
    }
}

// VALIDACIÓN DE GRUPOS
async function validarGrupo(datos, auth) {
    if (datos.periodo_id) {
        const periodo = await repo.porId(
            "periodo",
            datos.periodo_id
        );

        if (!periodo) {
            throw fallo(
                400,
                "PERIODO_INVALIDO",
                "El periodo no existe"
            );
        }
    }

    if (datos.maestro_id) {
        await validarMaestro(datos.maestro_id, auth);
    }

    if (datos.campus_id) {
        await validarCampus(datos.campus_id, auth);
    }

    // nivel_id es una referencia externa.
}

// VALIDACIÓN DE HORARIOS
async function validarHorario(datos, auth, actualId = null) {
    if (!DIAS_PERMITIDOS.includes(datos.dia_semana)) {
        throw fallo(
            400,
            "DIA_NO_PERMITIDO",
            "Solo se permiten clases de lunes a sábado"
        );
    }

    const horaInicio = segundos(datos.hora_inicio);
    const horaFin = segundos(datos.hora_fin);

    if (horaInicio < HORA_MINIMA) {
        throw fallo(
            400,
            "HORA_INICIO_INVALIDA",
            "Las clases no pueden comenzar antes de las 07:00"
        );
    }

    if (horaFin > HORA_MAXIMA) {
        throw fallo(
            400,
            "HORA_FIN_INVALIDA",
            "Las clases deben finalizar a más tardar a las 21:00"
        );
    }

    if (horaFin <= horaInicio) {
        throw fallo(
            400,
            "HORARIO_INVALIDO",
            "La hora final debe ser posterior a la inicial"
        );
    }

    const grupo = await repo.porId(
        "grupo",
        datos.grupo_id
    );

    if (!grupo) {
        throw fallo(
            404,
            "GRUPO_NO_ENCONTRADO",
            "El grupo no existe"
        );
    }

    const salon = await validarSalon(
        datos.salon_id,
        auth
    );

    if (Number(salon.campus_id) !== Number(grupo.campus_id)) {
        throw fallo(
            400,
            "SALON_CAMPUS_DISTINTO",
            "El salón debe pertenecer al campus del grupo"
        );
    }

    const resultado = await repo.pool.query(
        `SELECT h.horario_id
         FROM public.horario h
         JOIN public.grupo g
           ON g.grupo_id = h.grupo_id
         WHERE h.salon_id = $1
           AND h.dia_semana = $2
           AND g.periodo_id = $3
           AND h.hora_inicio < $5::time
           AND h.hora_fin > $4::time
           AND ($6::int IS NULL OR h.horario_id <> $6)
         LIMIT 1`,
        [
            datos.salon_id,
            datos.dia_semana,
            grupo.periodo_id,
            datos.hora_inicio,
            datos.hora_fin,
            actualId
        ]
    );

    if (resultado.rows.length > 0) {
        throw fallo(
            409,
            "SALON_OCUPADO",
            "Ya existe otro horario en el mismo salón y periodo"
        );
    }
}

// IDENTIFICAR TIPO DE ALUMNO
function obtenerTipoAlumno(alumno) {
    const tipo = alumno.tipo_alumno;

    let nombre = null;

    if (typeof tipo === "string") {
        nombre = tipo;
    } else if (
        tipo &&
        typeof tipo === "object" &&
        typeof tipo.nombre === "string"
    ) {
        nombre = tipo.nombre;
    } else if (typeof alumno.tipo_alumno_nombre === "string") {
        nombre = alumno.tipo_alumno_nombre;
    }

    if (!nombre) {
        throw fallo(
            502,
            "TIPO_ALUMNO_NO_DISPONIBLE",
            "Académico no devolvió el nombre del tipo de alumno"
        );
    }

    const normalizado = nombre
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();

    if (normalizado !== "interno" && normalizado !== "externo") {
        throw fallo(
            502,
            "TIPO_ALUMNO_INVALIDO",
            "Académico devolvió un tipo de alumno no reconocido"
        );
    }

    return normalizado;
}

// VALIDACIÓN DE INSCRIPCIONES
async function validarInscripcion(datos, auth) {
    const alumno = await validarAlumno(
        datos.alumno_id,
        auth
    );

    const tipoAlumno = obtenerTipoAlumno(alumno);

    const semestre = datos.semestre_al_inscribirse;

    if (tipoAlumno === "interno") {
        if (
            !Number.isInteger(semestre) ||
            semestre < 1 ||
            semestre > 13
        ) {
            throw fallo(
                400,
                "SEMESTRE_OBLIGATORIO",
                "Los alumnos internos deben indicar un semestre entre 1 y 13"
            );
        }
    }

    if (tipoAlumno === "externo") {
        if (semestre !== null && semestre !== undefined) {
            throw fallo(
                400,
                "SEMESTRE_NO_PERMITIDO",
                "Los alumnos externos no deben tener semestre"
            );
        }

        // Normalizar el valor antes de la inserción.
        datos.semestre_al_inscribirse = null;
    }
}

module.exports = {
    validarPeriodo,
    validarGrupo,
    validarHorario,
    validarInscripcion
};
