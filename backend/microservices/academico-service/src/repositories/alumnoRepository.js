const pool = require("../config/db");

const seleccion = `
  SELECT a.*, t.nombre AS tipo_alumno, c.nombre AS carrera,
         e.nombre AS estatus
  FROM public.alumno a
  JOIN public.tipo_alumno t ON t.tipo_alumno_id = a.tipo_alumno_id
  LEFT JOIN public.carrera c ON c.carrera_id = a.carrera_id
  JOIN public.estatus_academico e ON e.estatus_id = a.estatus_id
`;

async function obtenerTipoAlumno(tipoAlumnoId) {
  const r = await pool.query(
    "SELECT tipo_alumno_id, nombre FROM public.tipo_alumno WHERE tipo_alumno_id = $1",
    [tipoAlumnoId]
  );
  return r.rows[0] || null;
}

async function obtenerCarrera(carreraId) {
  const r = await pool.query(
    "SELECT carrera_id, nombre, estatus FROM public.carrera WHERE carrera_id = $1",
    [carreraId]
  );
  return r.rows[0] || null;
}

async function obtenerPorId(alumnoId) {
  const r = await pool.query(`${seleccion} WHERE a.alumno_id = $1`, [alumnoId]);
  return r.rows[0] || null;
}

async function obtenerPorUsuarioId(usuarioId) {
  const r = await pool.query(`${seleccion} WHERE a.usuario_id = $1`, [usuarioId]);
  return r.rows[0] || null;
}

async function crear(datos) {
  const r = await pool.query(
    `INSERT INTO public.alumno
     (usuario_id, tipo_alumno_id, matricula, nombre, apellido_paterno,
      apellido_materno, telefono, carrera_id, semestre, estatus_id)
     SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,e.estatus_id
     FROM public.estatus_academico e WHERE e.nombre = 'Activo'
     RETURNING alumno_id`,
    [datos.usuario_id, datos.tipo_alumno_id, datos.matricula ?? null,
     datos.nombre, datos.apellido_paterno, datos.apellido_materno ?? null,
     datos.telefono ?? null, datos.carrera_id ?? null, datos.semestre ?? null]
  );
  return r.rows[0] ? obtenerPorId(r.rows[0].alumno_id) : null;
}

async function listar(pagina, limite) {
  const offset = (pagina - 1) * limite;
  const [registros, conteo] = await Promise.all([
    pool.query(`${seleccion} ORDER BY a.alumno_id LIMIT $1 OFFSET $2`, [limite, offset]),
    pool.query("SELECT COUNT(*)::int AS total FROM public.alumno")
  ]);
  return { alumnos: registros.rows, total: conteo.rows[0].total, pagina, limite };
}

// La comprobación del propietario se repite en el UPDATE para evitar
// modificar otro usuario aunque haya cambios entre la consulta y la escritura.
async function modificar(alumnoId, cambios, usuarioPropietarioId = null) {
  const permitidos = [
    "tipo_alumno_id", "matricula", "nombre", "apellido_paterno",
    "apellido_materno", "telefono", "carrera_id", "semestre"
  ];
  const campos = permitidos.filter(campo => Object.hasOwn(cambios, campo));
  if (campos.length === 0) return obtenerPorId(alumnoId);

  const asignaciones = campos.map((campo, i) => `${campo} = $${i + 1}`);
  const valores = campos.map(campo => cambios[campo]);
  valores.push(alumnoId);

  let condicion = `alumno_id = $${valores.length}`;
  if (usuarioPropietarioId !== null) {
    valores.push(usuarioPropietarioId);
    condicion += ` AND usuario_id = $${valores.length}`;
  }

  const r = await pool.query(
    `UPDATE public.alumno SET ${asignaciones.join(", ")}
     WHERE ${condicion} RETURNING alumno_id`, valores
  );
  return r.rows[0] ? obtenerPorId(r.rows[0].alumno_id) : null;
}

async function cambiarEstatus(alumnoId, estatus) {
  const r = await pool.query(
    `UPDATE public.alumno a SET estatus_id = e.estatus_id
     FROM public.estatus_academico e
     WHERE a.alumno_id = $1 AND e.nombre = $2
     RETURNING a.alumno_id`,
    [alumnoId, estatus]
  );
  return r.rows[0] ? obtenerPorId(r.rows[0].alumno_id) : null;
}

module.exports = {
  obtenerTipoAlumno, obtenerCarrera, obtenerPorId,
  obtenerPorUsuarioId, crear, listar, modificar, cambiarEstatus
};
