function validateMiddleware(schema) {
    return (req, res, next) => {
        const resultado = schema.safeParse(req.body);

        if (!resultado.success) {
            return res.status(400).json({
                error: {
                    codigo: "ERROR_VALIDACION",
                    mensaje: "Los datos enviados no son válidos",
                    detalles: resultado.error.issues.map(issue => ({
                        campo: issue.path.join("."),
                        mensaje: issue.message
                    }))
                }
            });
        }

        req.body = resultado.data;

        next();
    };
}

module.exports = validateMiddleware;