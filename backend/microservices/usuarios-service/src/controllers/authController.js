const authService = require("../services/authService");

async function login(req, res, next) {
    try {
        const { identificador_acceso, password } = req.body;
        const resultado = await authService.login(identificador_acceso, password);
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

module.exports = { login, perfil, cambiarPassword };
