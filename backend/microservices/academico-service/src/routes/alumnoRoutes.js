const express = require("express");
const controller = require("../controllers/alumnoController");
const authMiddleware = require("../middlewares/authMiddleware");
const { permitirRoles, soloAdministrador, soloAlumno } = require("../middlewares/roleMiddleware");

const router = express.Router();
router.use(authMiddleware);

// Las rutas literales deben ir ANTES de /:id.
router.get("/mi-perfil", soloAlumno, controller.obtenerMiPerfil);
router.post("/mi-perfil", soloAlumno, controller.registrarMiPerfil);

router.post("/", soloAdministrador, controller.registrar);
router.get("/", soloAdministrador, controller.listar);
router.get("/:id", permitirRoles("Administrador", "Alumno"), controller.obtener);
router.patch("/:id", permitirRoles("Administrador", "Alumno"), controller.modificar);
router.patch("/:id/estatus", soloAdministrador, controller.cambiarEstatus);

module.exports = router;
