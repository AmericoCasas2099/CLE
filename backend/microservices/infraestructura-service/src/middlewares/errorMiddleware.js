function errorMiddleware(error, req, res, next) {
  if (error.code === "23505") {
    return res.status(409).json({ error: "REGISTRO_DUPLICADO", mensaje: "El nombre ya existe en este ámbito" });
  }
  if (error.code === "23503") {
    return res.status(400).json({ error: "REFERENCIA_INVALIDA", mensaje: "El campus indicado no existe" });
  }
  if (error.code === "23514") {
    return res.status(400).json({ error: "REGLA_INVALIDA", mensaje: "Los datos incumplen una restricción de la base de datos" });
  }
  if (error.code === "22001") {
    return res.status(400).json({ error: "LONGITUD_INVALIDA", mensaje: "Un campo supera la longitud permitida" });
  }
  if (error.status) {
    return res.status(error.status).json({ error: error.codigo || "SOLICITUD_INVALIDA", mensaje: error.message, ...(error.detalles && { detalles: error.detalles }) });
  }
  console.error("Error interno infraestructura:", error);
  return res.status(500).json({ error: "ERROR_INTERNO", mensaje: "Ocurrió un error interno" });
}
module.exports = errorMiddleware;
