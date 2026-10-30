function errorMiddleware(error, req, res, next) {
    if (res.headersSent) return next(error);
    if (error.status && error.codigo) {
        return res.status(error.status).json({
            error: { codigo: error.codigo, mensaje: error.message }
        });
    }
    if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
        return res.status(400).json({
            error: { codigo: "JSON_INVALIDO", mensaje: "El JSON enviado es inválido" }
        });
    }
    console.error("Error interno:", error);
    return res.status(500).json({
        error: { codigo: "ERROR_INTERNO", mensaje: "Ocurrió un error interno del servidor" }
    });
}
module.exports = errorMiddleware;
