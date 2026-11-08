const { z } = require("zod");
const service = require("../services/maestroService");
const repo = require("../repositories/maestroRepository");

const texto = z.string().trim().min(1).max(100);
const opcionalTexto = z.string().trim().max(100).nullable().optional();
const telefono = z.string().trim().regex(/^[0-9]{10}$/,"El teléfono debe contener exactamente 10 dígitos.").nullable().optional();


const crearSchema = z.object({
  usuario_id: z.number().int().positive(),
  nombre: texto,
  apellido_paterno: texto,
  apellido_materno: opcionalTexto,
  telefono: telefono,
  especialidad: opcionalTexto
}).strict();

const modificarSchema = crearSchema.omit({ usuario_id: true }).partial().refine(
  (obj) => Object.keys(obj).length > 0,
  { message: "Debes enviar al menos un campo" }
);

const estatusSchema = z.object({
  estatus_id: z.number().int().positive()
}).strict();

const idSchema = z.coerce.number().int().positive();
const paginacionSchema = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(100).default(10)
});

function validar(schema, datos) {
  const resultado = schema.safeParse(datos);
  if (!resultado.success) {
    const err = new Error("Datos inválidos");
    err.status = 400;
    err.codigo = "DATOS_INVALIDOS";
    err.detalles = resultado.error.issues;
    throw err;
  }
  return resultado.data;
}



async function verificarAccesoMaestro(maestroId, usuarioAutenticado) {
    const maestro = await repo.obtenerPorId(maestroId);

    if (!maestro) {
        const error = new Error("MAESTRO_NO_ENCONTRADO");
        error.status = 404;
        throw error;
    }

    if (usuarioAutenticado.rol === "Administrador") {
        return maestro;
    }

    if (
        usuarioAutenticado.rol === "Maestro" &&
        Number(usuarioAutenticado.sub) === Number(maestro.usuario_id)
    ) {
        return maestro;
    }

    const error = new Error("ACCESO_DENEGADO");
    error.status = 403;
    throw error;
}



function manejarError(error, res) {
  if (error.code === "23505") {
    return res.status(409).json({ error: "MAESTRO_DUPLICADO", mensaje: "Ya existe un maestro para este usuario" });
  }
  if (error.code === "23503") {
    return res.status(400).json({ error: "REFERENCIA_INVALIDA" });
  }
  if (!error.status) console.error("Error en maestro:", error);
  return res.status(error.status || 500).json({
    error: error.codigo || "ERROR_INTERNO",
    mensaje: error.status ? error.message : "Ocurrió un error interno",
    ...(error.detalles ? { detalles: error.detalles } : {})
  });
}

async function registrar(req, res) {
  try {
    const datos = validar(crearSchema, req.body);
    const maestro = await service.registrar(datos, req.headers.authorization);
    return res.status(201).json({ maestro });
  } catch (error) { return manejarError(error, res); }
}

async function listar(req, res) {
  try {
    const { pagina, limite } = validar(paginacionSchema, req.query);
    return res.json(await service.listar(pagina, limite));
  } catch (error) { return manejarError(error, res); }
}


async function obtener(req, res) {
    try {
        const maestroId = Number(req.params.id);

        if (!Number.isInteger(maestroId) || maestroId <= 0) {
            return res.status(400).json({
                error: "ID_INVALIDO",
                mensaje: "El ID del maestro debe ser un número válido"
            });
        }

        // Verifica que sea Administrador o el Maestro propietario.
        const maestro = await verificarAccesoMaestro(
            maestroId,
            req.auth
        );

        return res.status(200).json({ maestro });

    } catch (error) {
        if (error.status === 404) {
            return res.status(404).json({
                error: "MAESTRO_NO_ENCONTRADO",
                mensaje: "El maestro solicitado no existe"
            });
        }

        if (error.status === 403) {
            return res.status(403).json({
                error: "ACCESO_DENEGADO",
                mensaje: "No tienes permiso para consultar este maestro"
            });
        }

        console.error("Error al consultar maestro:", error);

        return res.status(500).json({
            error: "ERROR_INTERNO",
            mensaje: "Ocurrió un error al consultar el maestro"
        });
    }
}



async function modificar(req, res) {
    try {
        const maestroId = Number(req.params.id);

        if (!Number.isInteger(maestroId) || maestroId <= 0) {
            return res.status(400).json({
                error: "ID_INVALIDO",
                mensaje: "El ID del maestro debe ser un número válido"
            });
        }

        await verificarAccesoMaestro(
            maestroId,
            req.auth
        );

        const validacion = modificarSchema.safeParse(req.body);

        if (!validacion.success) {
            return res.status(400).json({
                error: "DATOS_INVALIDOS",
                detalles: validacion.error.issues.map(issue => ({
                    campo: issue.path.join("."),
                    mensaje: issue.message
                }))
            });
        }

        const maestro = await service.modificar(
            maestroId,
            validacion.data
        );

        return res.status(200).json({ maestro });

    } catch (error) {
        if (error.status === 404) {
            return res.status(404).json({
                error: "MAESTRO_NO_ENCONTRADO",
                mensaje: "El maestro solicitado no existe"
            });
        }

        if (error.status === 403) {
            return res.status(403).json({
                error: "ACCESO_DENEGADO",
                mensaje: "No tienes permiso para modificar este maestro"
            });
        }

        if (
            error.code === "23514" &&
            error.constraint === "chk_maestro_telefono"
        ) {
            return res.status(400).json({
                error: "TELEFONO_INVALIDO",
                mensaje: "El teléfono debe contener exactamente 10 dígitos"
            });
        }

        if (error.code === "23505") {
            return res.status(409).json({
                error: "DATO_DUPLICADO",
                mensaje: "Ya existe un registro con esos datos"
            });
        }

        console.error("Error al modificar maestro:", error);

        return res.status(500).json({
            error: "ERROR_INTERNO",
            mensaje: "Ocurrió un error al modificar el maestro"
        });
    }
}


async function cambiarEstatus(req, res) {
  try {
    const id = validar(idSchema, req.params.id);
    const { estatus_id } = validar(estatusSchema, req.body);
    return res.json({ maestro: await service.cambiarEstatus(id, estatus_id) });
  } catch (error) { return manejarError(error, res); }
}

const perfilMaestroSchema = z.object({
  nombre: z.string().trim().min(1).max(100),
  apellido_paterno: z.string().trim().min(1).max(100),
  apellido_materno: z.string().trim().max(100).nullable().optional(),
  telefono: z.string()
      .regex(
          /^[0-9]{10}$/,
          "El teléfono debe contener exactamente 10 dígitos"
      )
      .nullable()
      .optional(),
  especialidad: z.string().trim().max(100).nullable().optional()
}).strict();


async function obtenerMiPerfil(req, res) {
    try {
        const usuarioId = Number(req.auth.sub);

        const maestro = await service.obtenerMiPerfil(usuarioId);

        return res.status(200).json({ maestro });

    } catch (error) {
        if (error.status === 404) {
            return res.status(404).json({
                error: "PERFIL_NO_REGISTRADO",
                mensaje: "Todavía no tienes un perfil de maestro"
            });
        }

        console.error("Error al consultar perfil:", error);

        return res.status(500).json({
            error: "ERROR_INTERNO"
        });
    }
}


async function registrarMiPerfil(req, res) {
    try {
        const validacion = perfilMaestroSchema.safeParse(req.body);

        if (!validacion.success) {
            return res.status(400).json({
                error: "DATOS_INVALIDOS",
                detalles: validacion.error.issues.map(issue => ({
                    campo: issue.path.join("."),
                    mensaje: issue.message
                }))
            });
        }

        const usuarioId = Number(req.auth.sub);

        const maestro = await service.registrarMiPerfil(
            usuarioId,
            validacion.data
        );

        return res.status(201).json({ maestro });

    } catch (error) {
        if (error.status === 409 || error.code === "23505") {
            return res.status(409).json({
                error: "PERFIL_YA_EXISTE",
                mensaje: "Ya tienes un perfil de maestro registrado"
            });
        }

        if (
            error.code === "23514" &&
            error.constraint === "chk_maestro_telefono"
        ) {
            return res.status(400).json({
                error: "TELEFONO_INVALIDO",
                mensaje: "El teléfono debe contener exactamente 10 dígitos"
            });
        }

        if (error.message === "ESTATUS_ACTIVO_NO_EXISTE") {
            return res.status(500).json({
                error: "CONFIGURACION_INVALIDA",
                mensaje: "No está configurado el estatus académico Activo"
            });
        }

        console.error("Error al registrar perfil:", error);

        return res.status(500).json({
            error: "ERROR_INTERNO"
        });
    }
}


module.exports = { registrar, listar, obtener, modificar, cambiarEstatus, obtenerMiPerfil, registrarMiPerfil };
