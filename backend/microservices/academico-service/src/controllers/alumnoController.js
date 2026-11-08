const { z } = require("zod");
const service = require("../services/alumnoService");

const idPositivo = z.number().int().positive();
const texto = z.string().trim().min(1).max(100);
const textoOpcional = z.string().trim().max(100).nullable().optional();
const telefono = z.string()
  .regex(/^[0-9]{10}$/, "El teléfono debe contener exactamente 10 dígitos")
  .nullable().optional();
const matricula = z.string().trim().min(1).max(50).nullable().optional();

const datosPerfilSchema = z.object({
  tipo_alumno_id: idPositivo,
  matricula,
  nombre: texto,
  apellido_paterno: texto,
  apellido_materno: textoOpcional,
  telefono,
  carrera_id: idPositivo.nullable().optional(),
  semestre: z.number().int().min(1).max(20).nullable().optional()
}).strict();

const registroAdminSchema = datosPerfilSchema.extend({
  usuario_id: idPositivo
});

const modificacionSchema = datosPerfilSchema.partial().refine(
  valores => Object.keys(valores).length > 0,
  { message: "Debes proporcionar al menos un campo" }
);

const estatusSchema = z.object({
  estatus: z.enum(["Activo", "Inactivo"])
}).strict();

const paginacionSchema = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(100).default(10)
}).strict();

function validar(schema, valor) {
  const resultado = schema.safeParse(valor);
  if (!resultado.success) {
    throw Object.assign(new Error("Los datos proporcionados son inválidos"), {
      status: 400, codigo: "DATOS_INVALIDOS",
      detalles: resultado.error.issues.map(issue => ({
        campo: issue.path.join("."),
        mensaje: issue.message
      }))
    });
  }
  return resultado.data;
}

function obtenerId(texto) {
  if (!/^[1-9][0-9]*$/.test(texto)) {
    throw Object.assign(new Error("El ID debe ser un entero positivo"), {
      status: 400, codigo: "ID_INVALIDO"
    });
  }
  const id = Number(texto);
  if (!Number.isSafeInteger(id) || id > 2147483647) {
    throw Object.assign(new Error("El ID está fuera del rango permitido"), {
      status: 400, codigo: "ID_INVALIDO"
    });
  }
  return id;
}

function responderError(error, res) {
  if (error.code === "23505") {
    const codigo = error.constraint === "alumno_matricula_key"
      ? "MATRICULA_DUPLICADA"
      : "PERFIL_YA_EXISTE";
    return res.status(409).json({
      error: codigo,
      mensaje: codigo === "MATRICULA_DUPLICADA"
        ? "La matrícula ya está registrada"
        : "La cuenta ya tiene un perfil académico"
    });
  }
  if (error.code === "23503") {
    return res.status(400).json({
      error: "REFERENCIA_INVALIDA",
      mensaje: "Comprueba tipo de alumno, carrera y estatus"
    });
  }
  if (error.code === "23514" && error.constraint === "chk_alumno_telefono") {
    return res.status(400).json({
      error: "TELEFONO_INVALIDO",
      mensaje: "El teléfono debe contener exactamente 10 dígitos"
    });
  }
  if (error.code === "22001") {
    return res.status(400).json({
      error: "LONGITUD_INVALIDA",
      mensaje: "Un campo supera la longitud permitida"
    });
  }
  if (!error.status) console.error("Error en alumno:", error);
  return res.status(error.status || 500).json({
    error: error.codigo || "ERROR_INTERNO",
    mensaje: error.status ? error.message : "Ocurrió un error interno",
    ...(error.detalles ? { detalles: error.detalles } : {})
  });
}

async function registrar(req, res) {
  try {
    const datos = validar(registroAdminSchema, req.body);
    const alumno = await service.registrar(datos, req.headers.authorization);
    return res.status(201).json({ alumno });
  } catch (error) { return responderError(error, res); }
}

async function registrarMiPerfil(req, res) {
  try {
    const datos = validar(datosPerfilSchema, req.body);
    const alumno = await service.registrarMiPerfil(req.auth, datos);
    return res.status(201).json({ alumno });
  } catch (error) { return responderError(error, res); }
}

async function obtenerMiPerfil(req, res) {
  try {
    const alumno = await service.obtenerMiPerfil(req.auth);
    return res.status(200).json({ alumno });
  } catch (error) { return responderError(error, res); }
}

async function listar(req, res) {
  try {
    const { pagina, limite } = validar(paginacionSchema, req.query);
    return res.status(200).json(await service.listar(pagina, limite));
  } catch (error) { return responderError(error, res); }
}

async function obtener(req, res) {
  try {
    const alumno = await service.obtener(obtenerId(req.params.id), req.auth);
    return res.status(200).json({ alumno });
  } catch (error) { return responderError(error, res); }
}

async function modificar(req, res) {
  try {
    const alumnoId = obtenerId(req.params.id);
    const cambios = validar(modificacionSchema, req.body);
    const alumno = await service.modificar(alumnoId, cambios, req.auth);
    return res.status(200).json({ alumno });
  } catch (error) { return responderError(error, res); }
}

async function cambiarEstatus(req, res) {
  try {
    const alumnoId = obtenerId(req.params.id);
    const { estatus } = validar(estatusSchema, req.body);
    const alumno = await service.cambiarEstatus(alumnoId, estatus);
    return res.status(200).json({ alumno });
  } catch (error) { return responderError(error, res); }
}

module.exports = {
  registrar, registrarMiPerfil, obtenerMiPerfil, listar,
  obtener, modificar, cambiarEstatus
};
