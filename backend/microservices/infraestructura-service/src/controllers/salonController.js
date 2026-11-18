const { z, validar, idPositivo } = require("../utils");
const service = require("../services/salonService");
const crearSchema = z.object({
  campus_id: z.number().int().positive(),
  nombre: z.string().trim().min(1).max(50),
  capacidad: z.number().int().positive()
}).strict();
const modificarSchema = crearSchema.partial().refine(v => Object.keys(v).length>0, "Se requiere al menos un campo");
const estatusSchema = z.object({ estatus: z.enum(["Activo","Inactivo"]) }).strict();
const listaSchema = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(100).default(10),
  estatus: z.enum(["Activo","Inactivo"]).optional(),
  campus_id: z.coerce.number().int().positive().optional()
}).strict();
function wrap(fn) { return (req,res,next) => Promise.resolve().then(()=>fn(req,res)).catch(next); }
const crear = wrap(async (req,res) => res.status(201).json({ salon: await service.crear(validar(crearSchema,req.body)) }));
const listar = wrap(async (req,res) => res.json(await service.listar(validar(listaSchema,req.query))));
const obtener = wrap(async (req,res) => res.json({ salon: await service.obtener(idPositivo(req.params.id)) }));
const modificar = wrap(async (req,res) => res.json({ salon: await service.modificar(idPositivo(req.params.id),validar(modificarSchema,req.body)) }));
const cambiarEstatus = wrap(async (req,res) => res.json({ salon: await service.cambiarEstatus(idPositivo(req.params.id),validar(estatusSchema,req.body).estatus) }));
module.exports = { crear, listar, obtener, modificar, cambiarEstatus };
