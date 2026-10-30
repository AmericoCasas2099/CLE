const express = require("express");
const controller = require("../controllers/usuarioController");
const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");
const validateMiddleware = require("../middlewares/validateMiddleware");
const {
    crearUsuarioSchema, actualizarUsuarioSchema,
    cambiarEstatusSchema, cambiarRolSchema, listarUsuariosSchema
} = require("../schemas/usuarioSchema");

const router = express.Router();
router.use(authMiddleware, roleMiddleware("Administrador"));

router.post("/", validateMiddleware(crearUsuarioSchema), controller.crear);
router.get("/", validateMiddleware(listarUsuariosSchema, "query"), controller.listar);
router.get("/:usuarioId", controller.obtenerPorId);
router.patch("/:usuarioId", validateMiddleware(actualizarUsuarioSchema), controller.actualizar);
router.patch("/:usuarioId/estatus", validateMiddleware(cambiarEstatusSchema), controller.cambiarEstatus);
router.patch("/:usuarioId/rol", validateMiddleware(cambiarRolSchema), controller.cambiarRol);

module.exports = router;
