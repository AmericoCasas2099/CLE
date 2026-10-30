function validateMiddleware(schema, propiedad = "body") {
    return (req, res, next) => {
        const resultado = schema.safeParse(req[propiedad]);
        if (!resultado.success) {
            return res.status(400).json({
                error: {
                    codigo: "VALIDACION_ERROR",
                    mensaje: "Los datos enviados no son válidos",
                    detalles: resultado.error.issues.map(issue => ({
                        campo: issue.path.join("."),
                        mensaje: issue.message
                    }))
                }
            });
        }
        if (propiedad === "body") req.body = resultado.data;
        if (propiedad === "query") req.queryValidada = resultado.data;
        next();
    };
}

module.exports = validateMiddleware;
