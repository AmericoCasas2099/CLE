const pool=require("../config/db");
const tablas = Object.freeze({
  periodo:["nombre","fecha_inicio","fecha_fin","estatus"],
  grupo:["clave_grupo","nivel_id","maestro_id","campus_id","periodo_id","cupo_maximo","estatus"],
  horario:["grupo_id","salon_id","dia_semana","hora_inicio","hora_fin"],
  inscripcion:["alumno_id","grupo_id","fecha_inscripcion","estatus","semestre_al_inscribirse","calificacion_final"],
  calificacion_unidad:["inscripcion_id","numero_unidad","calificacion","registrado_por"]
});
const clave = {periodo:"periodo_id",grupo:"grupo_id",horario:"horario_id",inscripcion:"inscripcion_id",calificacion_unidad:"calificacion_id"};
function check(tabla) { if(!Object.hasOwn(tablas,tabla)) throw Error("Tabla no permitida"); }
async function porId(tabla,id,db=pool){check(tabla);const r=await db.query(`SELECT * FROM public.${tabla} WHERE ${clave[tabla]}=$1`,[id]);return r.rows[0]||null;}
async function crear(tabla,datos,db=pool){check(tabla);const cols=tablas[tabla].filter(x=>Object.hasOwn(datos,x));const vals=cols.map(x=>datos[x]);const r=await db.query(`INSERT INTO public.${tabla} (${cols.join(",")}) VALUES (${cols.map((_,i)=>`$${i+1}`).join(",")}) RETURNING *`,vals);return r.rows[0];}
async function modificar(tabla,id,datos,db=pool){check(tabla);const cols=tablas[tabla].filter(x=>Object.hasOwn(datos,x));if(!cols.length)return porId(tabla,id,db);const vals=cols.map(x=>datos[x]);vals.push(id);const r=await db.query(`UPDATE public.${tabla} SET ${cols.map((x,i)=>`${x}=$${i+1}`).join(",")} WHERE ${clave[tabla]}=$${vals.length} RETURNING *`,vals);return r.rows[0]||null;}
async function listar(tabla,{pagina=1,limite=10,filtros={}}={}){
 check(tabla);
 const campos=tablas[tabla].filter(x=>Object.hasOwn(filtros,x));const vals=campos.map(x=>filtros[x]);
 const where=campos.length?` WHERE ${campos.map((x,i)=>`${x}=$${i+1}`).join(" AND ")}`:"";
 const c=await pool.query(`SELECT COUNT(*)::int AS total FROM public.${tabla}${where}`,vals);
 const r=await pool.query(`SELECT * FROM public.${tabla}${where} ORDER BY ${clave[tabla]} DESC LIMIT $${vals.length+1} OFFSET $${vals.length+2}`,[...vals,limite,(pagina-1)*limite]);
 return {datos:r.rows,total:c.rows[0].total,pagina,limite};
}
module.exports={pool,porId,crear,modificar,listar};
