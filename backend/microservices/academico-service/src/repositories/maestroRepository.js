const pool = require("../config/db");

async function crear(datos) {
  const resultado = await pool.query(
    `INSERT INTO public.maestro
       (usuario_id, nombre, apellido_paterno, apellido_materno, telefono, especialidad, estatus_id)
     SELECT $1, $2, $3, $4, $5, $6, e.estatus_id
     FROM public.estatus_academico e
     WHERE e.nombre = 'Activo'
     RETURNING *`,
    [datos.usuario_id, datos.nombre, datos.apellido_paterno,
     datos.apellido_materno ?? null, datos.telefono ?? null,
     datos.especialidad ?? null]
  );
  return resultado.rows[0] || null;
}

async function listar(pagina, limite) {
  const offset = (pagina - 1) * limite;
  const [registros, conteo] = await Promise.all([
    pool.query(
      `SELECT m.*, e.nombre AS estatus
       FROM public.maestro m
       JOIN public.estatus_academico e ON e.estatus_id = m.estatus_id
       ORDER BY m.maestro_id
       LIMIT $1 OFFSET $2`, [limite, offset]
    ),
    pool.query("SELECT COUNT(*)::int AS total FROM public.maestro")
  ]);
  return { maestros: registros.rows, total: conteo.rows[0].total, pagina, limite };
}

async function obtenerPorId(maestroId) {
  const resultado = await pool.query(
    `SELECT m.*, e.nombre AS estatus
     FROM public.maestro m
     JOIN public.estatus_academico e ON e.estatus_id = m.estatus_id
     WHERE m.maestro_id = $1`, [maestroId]
  );
  return resultado.rows[0] || null;
}

async function obtenerPorUsuarioId(usuarioId) {
  const resultado = await pool.query(
      `SELECT
          m.*,
          e.nombre AS estatus
       FROM public.maestro m
       JOIN public.estatus_academico e
          ON m.estatus_id = e.estatus_id
       WHERE m.usuario_id = $1`,
      [usuarioId]
  );

  return resultado.rows[0] || null;
}

async function modificar(maestroId, cambios) {
  const camposPermitidos = ["nombre", "apellido_paterno", "apellido_materno", "telefono", "especialidad"];
  const campos = camposPermitidos.filter((campo) => Object.hasOwn(cambios, campo));
  const asignaciones = campos.map((campo, indice) => `${campo} = $${indice + 1}`);
  const valores = campos.map((campo) => cambios[campo]);
  valores.push(maestroId);

  const resultado = await pool.query(
    `UPDATE public.maestro SET ${asignaciones.join(", ")}
     WHERE maestro_id = $${valores.length} RETURNING *`, valores
  );
  return resultado.rows[0] || null;
}

async function cambiarEstatus(maestroId, estatusId) {
  const resultado = await pool.query(
    `UPDATE public.maestro
     SET estatus_id = $1
     WHERE maestro_id = $2
     RETURNING *`, [estatusId, maestroId]
  );
  return resultado.rows[0] || null;
}

async function obtenerEstatus(estatusId) {
  const resultado = await pool.query(
    "SELECT estatus_id, nombre FROM public.estatus_academico WHERE estatus_id = $1",
    [estatusId]
  );
  return resultado.rows[0] || null;
}

async function crearPerfilPropio(usuarioId, datos) {
  const resultado = await pool.query(
      `INSERT INTO public.maestro (
          usuario_id,
          nombre,
          apellido_paterno,
          apellido_materno,
          telefono,
          especialidad,
          estatus_id
      )
      SELECT
          $1, $2, $3, $4, $5, $6, e.estatus_id
      FROM public.estatus_academico e
      WHERE e.nombre = 'Activo'
      RETURNING maestro_id`,
      [
          usuarioId,
          datos.nombre,
          datos.apellido_paterno,
          datos.apellido_materno ?? null,
          datos.telefono ?? null,
          datos.especialidad ?? null
      ]
  );

  if (resultado.rows.length === 0) {
      return null;
  }

  return resultado.rows[0];
}


module.exports = { crear, listar, obtenerPorId, obtenerPorUsuarioId, modificar, cambiarEstatus, obtenerEstatus,
                   crearPerfilPropio};
