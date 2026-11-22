
const { z } = require("zod");

const id = z.number().int().positive();

const fecha = z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine(
        x => !Number.isNaN(Date.parse(x)),
        "Fecha inválida"
    );

const hora = z.string().regex(
    /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/,
    "La hora debe tener formato HH:mm o HH:mm:ss"
);

const estatus = z.enum(["Activo", "Inactivo"]);

const diasPermitidos = z.enum([
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado"
]);

// Convierte una hora válida a segundos para compararla.
function horaASegundos(valor) {
    const [horas, minutos, segundos = 0] = valor
        .split(":")
        .map(Number);

    return horas * 3600 + minutos * 60 + segundos;
}

// Valida las restricciones del horario.
function validarHorario(datos, ctx) {
    const inicio = datos.hora_inicio;
    const fin = datos.hora_fin;

    if (inicio !== undefined) {
        const segundosInicio = horaASegundos(inicio);

        if (segundosInicio < 7 * 3600) {
            ctx.addIssue({
                code: "custom",
                path: ["hora_inicio"],
                message:
                    "Las clases no pueden comenzar antes de las 07:00"
            });
        }

        if (segundosInicio >= 21 * 3600) {
            ctx.addIssue({
                code: "custom",
                path: ["hora_inicio"],
                message:
                    "Las clases deben comenzar antes de las 21:00"
            });
        }
    }

    if (fin !== undefined) {
        const segundosFin = horaASegundos(fin);

        if (segundosFin > 21 * 3600) {
            ctx.addIssue({
                code: "custom",
                path: ["hora_fin"],
                message:
                    "Las clases deben finalizar a más tardar a las 21:00"
            });
        }

        if (segundosFin <= 7 * 3600) {
            ctx.addIssue({
                code: "custom",
                path: ["hora_fin"],
                message:
                    "Las clases deben finalizar después de las 07:00"
            });
        }
    }

    if (inicio !== undefined && fin !== undefined) {
        if (horaASegundos(fin) <= horaASegundos(inicio)) {
            ctx.addIssue({
                code: "custom",
                path: ["hora_fin"],
                message:
                    "La hora de finalización debe ser posterior a la de inicio"
            });
        }
    }
}

// Esquema base de horarios para POST y PATCH.
const horarioBase = z.object({
    grupo_id: id,
    salon_id: id,
    dia_semana: diasPermitidos,
    hora_inicio: hora,
    hora_fin: hora
}).strict();

const schemas = {
    periodo: z.object({
        nombre: z.string().trim().min(1).max(50),
        fecha_inicio: fecha,
        fecha_fin: fecha,
        estatus: estatus.optional()
    }).strict(),

    grupo: z.object({
        clave_grupo: z.string().trim().min(1).max(30),
        nivel_id: id,
        maestro_id: id,
        campus_id: id,
        periodo_id: id,
        cupo_maximo: z.number().int().positive(),
        estatus: estatus.optional()
    }).strict(),

    horario: horarioBase.superRefine(validarHorario),

    inscripcion: z.object({
        alumno_id: id,
        grupo_id: id,
        semestre_al_inscribirse: z.number()
            .int()
            .min(1)
            .max(13)
            .nullable()
            .optional()
    }).strict(),

    calificacion_unidad: z.object({
        numero_unidad: z.number().int().min(1).max(10),
        calificacion: z.number().min(0).max(100)
    }).strict()
};

const parciales = {
    periodo: schemas.periodo.partial(),

    grupo: schemas.grupo.partial(),

    horario: horarioBase
        .partial()
        .superRefine(validarHorario)
};

const status = z.object({
    estatus: estatus
}).strict();

const inscripcionStatus = z.object({
    estatus: z.enum([
        "Inscrito",
        "En curso",
        "Baja"
    ])
}).strict();

const paginacion = z.object({
    pagina: z.coerce.number().int().min(1).default(1),
    limite: z.coerce.number().int().min(1).max(100).default(10)
});

module.exports = {
    schemas,
    parciales,
    status,
    inscripcionStatus,
    paginacion
};
