// Solo devuelve campos descriptivos apropiados para las vistas de grupos.
// No expone correo, teléfono ni información de autenticación de los maestros.
const express = require('express');
const pool = require('../config/db');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

function obtenerIds(texto) {
  if (typeof texto !== 'string' || !/^\d+(,\d+)*$/.test(texto)) return null;
  const ids = [...new Set(texto.split(',').map(Number))];
  if (ids.length > 100 || ids.some(n => !Number.isSafeInteger(n) || n < 1 || n > 2147483647)) return null;
  return ids;
}

router.get('/resumen-grupos', async (req, res) => {
  if (!['Administrador', 'Maestro', 'Alumno'].includes(req.auth?.rol)) {
    return res.status(403).json({ error: 'ACCESO_DENEGADO' });
  }
  const maestroIds = obtenerIds(req.query.maestro_ids);
  const nivelIds = obtenerIds(req.query.nivel_ids);
  if (!maestroIds || !nivelIds) {
    return res.status(400).json({ error: 'IDS_INVALIDOS', mensaje: 'Usa maestro_ids y nivel_ids como listas de enteros positivos separadas por comas' });
  }
  try {
    const [maestros, niveles] = await Promise.all([
      pool.query(
        `SELECT maestro_id, nombre, apellido_paterno, apellido_materno
         FROM public.maestro WHERE maestro_id = ANY($1::int[])`, [maestroIds]
      ),
      pool.query(
        `SELECT n.nivel_id, n.nombre, n.numero_nivel, n.idioma_id,
                json_build_object('idioma_id', i.idioma_id, 'nombre', i.nombre) AS idioma
         FROM public.nivel n
         JOIN public.idioma i ON i.idioma_id = n.idioma_id
         WHERE n.nivel_id = ANY($1::int[])`, [nivelIds]
      )
    ]);
    return res.json({ maestros: maestros.rows, niveles: niveles.rows });
  } catch (error) {
    console.error('Error consultando resumen de grupos:', error);
    return res.status(500).json({ error: 'ERROR_INTERNO' });
  }
});

module.exports = router;
