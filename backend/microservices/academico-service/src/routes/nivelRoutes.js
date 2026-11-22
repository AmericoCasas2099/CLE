const express = require("express");
const auth = require("../middlewares/authMiddleware");
const { permitirRoles } = require("../middlewares/roleMiddleware");
const c = require("../controllers/catalogoController");
const router = express.Router();
router.use(auth);
router.get("/", permitirRoles("Administrador", "Maestro", "Alumno"), c.listarNiveles);
router.get("/:id", permitirRoles("Administrador", "Maestro", "Alumno"), c.obtenerNivel);
module.exports = router;
