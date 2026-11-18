const pool = require("../config/db");

async function crear(datos) {
  const r = await pool.query(
    `INSERT INTO public.campus (nombre, ubicacion, estatus)
     VALUES ($1,$2,'Activo') RETURNING *`,
    [datos.nombre, datos.ubicacion]
  );
  return r.rows[0];
}
async function obtener(id) {
  const r = await pool.query(`SELECT * FROM public.campus WHERE campus_id=$1`, [id]);
  return r.rows[0] || null;
}
async function listar({ pagina, limite, estatus }) {
  const filtro = estatus ? `WHERE estatus=$3` : ``;
  const params = estatus ? [limite, (pagina - 1) * limite, estatus] : [limite, (pagina - 1) * limite];
  const [r, n] = await Promise.all([
    pool.query(`SELECT * FROM public.campus ${filtro} ORDER BY campus_id LIMIT $1 OFFSET $2`, params),
    pool.query(`SELECT COUNT(*)::int AS total FROM public.campus ${estatus ? "WHERE estatus=$1" : ""}`, estatus ? [estatus] : [])
  ]);
  return { campus: r.rows, total: n.rows[0].total, pagina, limite };
}
async function modificar(id, datos) {
  const campos = Object.keys(datos);
  const values = campos.map(c => datos[c]);
  const sets = campos.map((c,i) => `${c}=$${i+1}`).join(", ");
  const r = await pool.query(`UPDATE public.campus SET ${sets} WHERE campus_id=$${values.length+1} RETURNING *`, [...values,id]);
  return r.rows[0] || null;
}
async function cambiarEstatus(id, estatus) {
  const r = await pool.query(`UPDATE public.campus SET estatus=$1 WHERE campus_id=$2 RETURNING *`, [estatus,id]);
  return r.rows[0] || null;
}
module.exports = { crear, obtener, listar, modificar, cambiarEstatus };
