const { fallo }=require("../utils/http");
const { consultarMiPerfilMaestro }=require("../integraciones");
const repo=require("../repositories/baseRepository");
async function accesoGrupo(req,grupoId) {
 if(req.auth.rol==="Administrador") return;
 const g=await repo.porId("grupo",grupoId);
 if(!g) throw fallo(404,"GRUPO_NO_ENCONTRADO","Grupo no encontrado");
 if(req.auth.rol!=="Maestro")throw fallo(403,"ACCESO_DENEGADO","Solo el maestro asignado puede realizar esta acción");
 const m=await consultarMiPerfilMaestro(req.headers.authorization);
 if(Number(m.usuario_id)!==Number(req.auth.sub) || Number(m.maestro_id)!==Number(g.maestro_id))throw fallo(403,"ACCESO_DENEGADO","No eres maestro del grupo");
}
async function accesoInscripcion(req,inscripcionId) {
 const i=await repo.porId("inscripcion",inscripcionId);
 if(!i)throw fallo(404,"INSCRIPCION_NO_ENCONTRADA","Inscripción no encontrada");
 await accesoGrupo(req,i.grupo_id);
 return i;
}
module.exports={accesoGrupo,accesoInscripcion};
