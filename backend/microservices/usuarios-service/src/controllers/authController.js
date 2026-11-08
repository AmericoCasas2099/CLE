const authService = require("../services/authService");
const { z } = require("zod");

async function login(req, res, next) {
    try {
        const { correo, password } = req.body;
        const resultado = await authService.login(correo, password);
        return res.status(200).json(resultado);
    } catch (error) {
        next(error);
    }
}

function perfil(req, res) {
    return res.status(200).json({ usuario: req.usuario });
}

async function cambiarPassword(req, res, next) {
    try {
        const {
            password_actual,
            password_nueva
        } = req.body;

        await authService.cambiarPassword(
            req.auth.usuario_id,
            password_actual,
            password_nueva
        );

        return res.status(204).send();

    } catch (error) {
        next(error);
    }
}

const actualizarCorreoSchema = z.object({
    correo: z.email().trim().toLowerCase(),
    password: z.string().min(1, "La contraseña es obligatoria")
}).strict();

async function actualizarCorreo(req, res) {
    const validacion = actualizarCorreoSchema.safeParse(req.body);

    if (!validacion.success) {
        return res.status(400).json({
            error: "DATOS_INVALIDOS",
            detalles: validacion.error.issues
        });
    }

    try {
        const usuarioId = req.usuario?.usuario_id;

        if (!usuarioId) {
            return res.status(401).json({
                error: "TOKEN_INVALIDO"
            });
        }

        const resultado = await authService.actualizarCorreoPropio(
            usuarioId,
            validacion.data.correo,
            validacion.data.password
        );

        return res.status(200).json(resultado);

    } catch (error) {
        const erroresConocidos = {
            USUARIO_NO_DISPONIBLE: 403,
            CREDENCIALES_INVALIDAS: 401,
            CORREO_SIN_CAMBIOS: 400,
            CORREO_DUPLICADO: 409
        };

        const status = erroresConocidos[error.message];

        if (status) {
            return res.status(status).json({
                error: error.message
            });
        }

        console.error("Error al actualizar correo:", error);

        return res.status(500).json({
            error: "ERROR_INTERNO"
        });
    }
}

module.exports = { login, perfil, cambiarPassword, actualizarCorreo };
