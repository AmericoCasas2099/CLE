function errorMiddleware(error, req, res, next) {
    if (res.headersSent) return next(error);

    if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
        return res.status(400).json({
            error: {
                codigo: "JSON_INVALIDO",
                mensaje: "El JSON enviado es inválido"
            }
        });
    }

    if (error.status && error.codigo) {
        const detalles = Array.isArray(error.detalles)
            ? error.detalles.map(detalle => ({
                campo: detalle.campo || (Array.isArray(detalle.path) ? detalle.path.join(".") : ""),
                mensaje: detalle.mensaje || detalle.message || "Valor inválido"
            }))
            : undefined;

        return res.status(error.status).json({
            error: {
                codigo: error.codigo,
                mensaje: error.message,
                ...(detalles?.length ? { detalles } : {})
            }
        });
    }

    console.error("Error interno:", error);
    return res.status(500).json({
        error: { codigo: "ERROR_INTERNO", mensaje: "Ocurrió un error interno del servidor" }
    });
}

module.exports = errorMiddleware;
