"use strict";
const express = require("express");
const crypto = require("node:crypto");
const pool = require("../config/db");
const auth = require("../middlewares/authMiddleware");
const router = express.Router();

router.use(auth);

function mismaClave(recibida, esperada) {
  if (typeof recibida !== "string" || typeof esperada !== "string" || !esperada) return false;
  const a = crypto.createHash("sha256").update(recibida).digest();
  const b = crypto.createHash("sha256").update(esperada).digest();
  return crypto.timingSafeEqual(a, b);
}

// Uso exclusivo entre servicios; no expone teléfono, correo o usuario_id.
router.get("/resumen-alumnos", async (req, res) => {
  if (!["Administrador", "Maestro"].includes(req.auth?.rol)) {
    return res.status(403).json({ error: "ACCESO_DENEGADO" });
  }
  if (!mismaClave(req.get("X-CLE-Internal-Key"), process.env.CLE_INTERNAL_API_KEY)) {
    return res.status(403).json({ error: "ACCESO_INTERNO_DENEGADO" });
  }
  const raw = req.query.ids;
  if (typeof raw !== "string" || !/^[1-9]\d*(,[1-9]\d*)*$/.test(raw)) {
    return res.status(400).json({ error: "IDS_INVALIDOS", mensaje: "Indica ids=1,2,3" });
  }
  const ids = [...new Set(raw.split(",").map(Number))];
  if (ids.length > 100 || ids.some(x => !Number.isSafeInteger(x) || x > 2147483647)) {
    return res.status(400).json({ error: "IDS_INVALIDOS" });
  }
  try {
    const resultado = await pool.query(
      `SELECT a.alumno_id, a.nombre, a.apellido_paterno, a.apellido_materno,
              a.matricula, t.nombre AS tipo_alumno, c.nombre AS carrera
         FROM public.alumno a
         JOIN public.tipo_alumno t ON t.tipo_alumno_id = a.tipo_alumno_id
         LEFT JOIN public.carrera c ON c.carrera_id = a.carrera_id
        WHERE a.alumno_id = ANY($1::int[])
        ORDER BY a.alumno_id`,
      [ids]
    );
    return res.json({ alumnos: resultado.rows });
  } catch (error) {
    console.error("No se pudo consultar resumen-alumnos:", error);
    return res.status(500).json({ error: "ERROR_INTERNO" });
  }
});
module.exports = router;
