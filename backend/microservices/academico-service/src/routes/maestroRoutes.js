
const express = require("express");
const router = express.Router();

const controller = require("../controllers/maestroController");
const authMiddleware = require("../middlewares/authMiddleware");

const {
    permitirRoles,
    soloAdministrador,
    soloMaestro
} = require("../middlewares/roleMiddleware");

router.use(authMiddleware);

// Perfil propio del Maestro.
router.get(
    "/mi-perfil",
    soloMaestro,
    controller.obtenerMiPerfil
);

router.post(
    "/mi-perfil",
    soloMaestro,
    controller.registrarMiPerfil
);

// Administración.
router.post(
    "/",
    soloAdministrador,
    controller.registrar
);

router.get(
    "/",
    soloAdministrador,
    controller.listar
);

// Consulta administrativa o del propietario.
router.get(
    "/:id",
    permitirRoles("Administrador", "Maestro"),
    controller.obtener
);

// Modificación administrativa o del propietario.
router.patch(
    "/:id",
    permitirRoles("Administrador", "Maestro"),
    controller.modificar
);

// Solo el Administrador cambia estatus.
router.patch(
    "/:id/estatus",
    soloAdministrador,
    controller.cambiarEstatus
);

module.exports = router;
