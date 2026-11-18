const pool = require("../config/db");
const select = `SELECT s.*, c.nombre AS campus_nombre, c.estatus AS campus_estatus
                FROM public.salon s JOIN public.campus c ON c.campus_id=s.campus_id`;
async function obtener(id) {
  const r = await pool.query(`${select} WHERE s.salon_id=$1`, [id]);
  return r.rows[0] || null;
}
async function crear(datos) {
  const r = await pool.query(
    `INSERT INTO public.salon (campus_id,nombre,capacidad,estatus)
     VALUES ($1,$2,$3,'Activo') RETURNING salon_id`,
    [datos.campus_id,datos.nombre,datos.capacidad]
  );
  return obtener(r.rows[0].salon_id);
}
async function listar({ pagina, limite, estatus, campus_id }) {
  const where=[]; const filtros=[];
  if (estatus) { filtros.push(estatus); where.push(`s.estatus=$${filtros.length}`); }
  if (campus_id) { filtros.push(campus_id); where.push(`s.campus_id=$${filtros.length}`); }
  const condicion = where.length ? `WHERE ${where.join(' AND ')}` : ``;
  const [r,n] = await Promise.all([
    pool.query(`${select} ${condicion} ORDER BY s.salon_id LIMIT $${filtros.length+1} OFFSET $${filtros.length+2}`,
      [...filtros,limite,(pagina-1)*limite]),
    pool.query(`SELECT COUNT(*)::int AS total FROM public.salon s ${condicion}`, filtros)
  ]);
  return { salones: r.rows, total: n.rows[0].total, pagina, limite };
}
async function modificar(id, datos) {
  const campos = Object.keys(datos);
  const values = campos.map(c => datos[c]);
  const sets = campos.map((c,i) => `${c}=$${i+1}`).join(", ");
  const r = await pool.query(`UPDATE public.salon SET ${sets} WHERE salon_id=$${values.length+1} RETURNING salon_id`, [...values,id]);
  return r.rows[0] ? obtener(id) : null;
}
async function cambiarEstatus(id, estatus) {
  const r = await pool.query(`UPDATE public.salon SET estatus=$1 WHERE salon_id=$2 RETURNING salon_id`, [estatus,id]);
  return r.rows[0] ? obtener(id) : null;
}
module.exports = { crear, obtener, listar, modificar, cambiarEstatus };
