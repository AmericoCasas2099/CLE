function notFoundMiddleware(req, res) {
    return res.status(404).json({
        error: { codigo: "RUTA_NO_ENCONTRADA", mensaje: "El endpoint solicitado no existe" }
    });
}
module.exports = notFoundMiddleware;
