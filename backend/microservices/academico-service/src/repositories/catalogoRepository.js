const pool = require("../config/db");

async function listarIdiomas() {
  const r = await pool.query(
    "SELECT idioma_id, nombre FROM public.idioma ORDER BY nombre, idioma_id"
  );
  return r.rows;
}

async function obtenerIdioma(idiomaId) {
  const r = await pool.query(
    "SELECT idioma_id, nombre FROM public.idioma WHERE idioma_id = $1",
    [idiomaId]
  );
  return r.rows[0] || null;
}

const nivelesSql = `
  SELECT n.nivel_id, n.nombre, n.numero_nivel, n.idioma_id,
         json_build_object('idioma_id', i.idioma_id, 'nombre', i.nombre) AS idioma
  FROM public.nivel n
  JOIN public.idioma i ON i.idioma_id = n.idioma_id
`;

async function listarNiveles(idiomaId = null) {
  const r = await pool.query(
    `${nivelesSql} WHERE ($1::int IS NULL OR n.idioma_id = $1)
     ORDER BY n.idioma_id, n.numero_nivel NULLS LAST, n.nivel_id`,
    [idiomaId]
  );
  return r.rows;
}

async function obtenerNivel(nivelId) {
  const r = await pool.query(
    `${nivelesSql} WHERE n.nivel_id = $1`, [nivelId]
  );
  return r.rows[0] || null;
}

module.exports = {
  listarIdiomas, obtenerIdioma, listarNiveles, obtenerNivel
};
