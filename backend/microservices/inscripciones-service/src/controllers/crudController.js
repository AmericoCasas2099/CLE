const repo=require("../repositories/baseRepository");
const {schemas,parciales,status,paginacion}=require("../validators/schemas");
const {fallo,id,parse,handler}=require("../utils/http");
const reglas=require("../services/reglasService");
const {enriquecerGrupos}=require("../services/gruposEnriquecidosService");
const cierre=require("../services/cierreService");
const run={
 periodo:reglas.validarPeriodo,grupo:reglas.validarGrupo,horario:reglas.validarHorario
};
function valido(tabla,datos,req,anterior=null){
 if(tabla==="periodo")return reglas.validarPeriodo(anterior?{...anterior,...datos}:datos);
 if(tabla==="grupo")return reglas.validarGrupo(datos,req.headers.authorization);
 if(tabla==="horario")return reglas.validarHorario(anterior?{...anterior,...datos}:datos,req.headers.authorization,anterior?.horario_id??null);
}
function crud(tabla) {
 const obtener=handler(async(req,res)=>{
  const x=await repo.porId(tabla,id(req.params.id));
  if(!x)throw fallo(404,"NO_ENCONTRADO","No existe el registro");
  if(tabla==="grupo") {
   const detalles=await enriquecerGrupos([x],req.headers.authorization);
   return res.json({grupo:detalles.grupos[0],advertencias:detalles.advertencias});
  }
  res.json({[tabla]:x});
 });
 const listar=handler(async(req,res)=>{
  const {pagina,limite}=parse(paginacion,{pagina:req.query.pagina,limite:req.query.limite});
  const permitidos=tabla==="grupo"?["estatus","periodo_id","maestro_id","campus_id"]:tabla==="periodo"?["estatus"]:["grupo_id","salon_id","dia_semana"];
  const filtros={};for(const k of permitidos){if(req.query[k]!==undefined)filtros[k]=k.endsWith("_id")?id(req.query[k]):req.query[k];}
  if(Object.hasOwn(filtros,"estatus")&&!['Activo','Inactivo'].includes(filtros.estatus))throw fallo(400,"ESTATUS_INVALIDO","Estatus inválido");
  const d=await repo.listar(tabla,{pagina,limite,filtros});
  if(tabla==="grupo") {
   const detalles=await enriquecerGrupos(d.datos,req.headers.authorization);
   return res.json({grupos:detalles.grupos,total:d.total,pagina,limite,advertencias:detalles.advertencias});
  }
  res.json({[tabla==="periodo"?"periodos":"horarios"]:d.datos,total:d.total,pagina,limite});
 });
 const crear=handler(async(req,res)=>{
  const datos=parse(schemas[tabla],req.body);await valido(tabla,datos,req);
  const creado=await repo.crear(tabla,datos);
  if(tabla==="grupo") {
   const detalles=await enriquecerGrupos([creado],req.headers.authorization);
   return res.status(201).json({grupo:detalles.grupos[0],advertencias:detalles.advertencias});
  }
  res.status(201).json({[tabla]:creado});
 });
 const modificar=handler(async(req,res)=>{
  const n=id(req.params.id),anterior=await repo.porId(tabla,n);
  if(!anterior)throw fallo(404,"NO_ENCONTRADO","No existe el registro");
  const datos=parse(parciales[tabla],req.body);if(!Object.keys(datos).length)throw fallo(400,"DATOS_INVALIDOS","No hay campos para modificar");
  // Los estatus se cambian exclusivamente en /:id/estatus.
  if ((tabla === 'periodo' || tabla === 'grupo') && Object.hasOwn(datos,'estatus')) {
    throw fallo(400,'USAR_ENDPOINT_ESTATUS','Utiliza /:id/estatus para cambiar el estatus');
  }
  if(tabla==='periodo' && anterior.fecha_cierre != null) throw fallo(409,'PERIODO_CERRADO','No se puede modificar un periodo cerrado');
  if(tabla==='grupo') {
    const period=await repo.porId('periodo',anterior.periodo_id);
    if(anterior.fecha_cierre != null || period?.fecha_cierre != null || period?.estatus !== 'Activo') {
      throw fallo(409,'GRUPO_CERRADO','No se puede modificar un grupo cerrado o su periodo');
    }
  }
  await valido(tabla,datos,req,anterior);
  const r=await repo.modificar(tabla,n,datos);
  if(tabla==="grupo") {
   const detalles=await enriquecerGrupos([r],req.headers.authorization);
   return res.json({grupo:detalles.grupos[0],advertencias:detalles.advertencias});
  }
  res.json({[tabla]:r});
 });
 const cambiarEstatus=handler(async(req,res)=>{
  const n=id(req.params.id),datos=parse(status,req.body);
  if(!await repo.porId(tabla,n))throw fallo(404,"NO_ENCONTRADO","No existe el registro");
  if (tabla==='periodo') {
    return res.json(await cierre.cambiarEstatusPeriodo(n,datos.estatus));
  }
  const g=await repo.porId('grupo',n);
  const periodo=await repo.porId('periodo',g.periodo_id);
  if(g.fecha_cierre != null || periodo?.fecha_cierre != null || periodo?.estatus !== 'Activo') {
    throw fallo(409,'GRUPO_CERRADO','No puedes modificar el estatus de un grupo cerrado');
  }
  const actualizado=await repo.modificar(tabla,n,datos);
  if(tabla==="grupo") {
   const detalles=await enriquecerGrupos([actualizado],req.headers.authorization);
   return res.json({grupo:detalles.grupos[0],advertencias:detalles.advertencias});
  }
  res.json({[tabla]:actualizado});
 });
 return {obtener,listar,crear,modificar,cambiarEstatus};
}
// GET /api/v1/grupos/mis-grupos
// El rol Maestro ya se comprueba en la ruta.
const { consultarMiPerfilMaestro } = require("../integraciones");
const misGrupos = handler(async (req, res) => {
  const { pagina, limite } = parse(paginacion, {
    pagina: req.query.pagina,
    limite: req.query.limite
  });
  const maestro = await consultarMiPerfilMaestro(req.headers.authorization);
  if (Number(maestro.usuario_id) !== Number(req.auth.sub)) {
    throw fallo(403, "ACCESO_DENEGADO", "El perfil académico no corresponde al usuario autenticado");
  }
  const d = await repo.listar("grupo", {
    pagina,
    limite,
    filtros: { maestro_id: Number(maestro.maestro_id) }
  });
  const detalles = await enriquecerGrupos(d.datos, req.headers.authorization);
  res.json({ grupos: detalles.grupos, total: d.total, pagina, limite, advertencias: detalles.advertencias });
});

module.exports={crud,misGrupos};
