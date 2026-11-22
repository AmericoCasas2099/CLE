
const express = require("express");
const { crud, misGrupos } = require("../controllers/crudController");
const ins = require("../controllers/inscripcionController");
const auth = require("../middlewares/authMiddleware");
const { admin, roles } = require("../middlewares/roleMiddleware");
const cierreController = require("../controllers/cierreController");

const router = express.Router();

router.use(auth);

// PERIODOS, GRUPOS Y HORARIOS
for (const [nombre, tabla] of [
    ["periodos", "periodo"],
    ["grupos", "grupo"],
    ["horarios", "horario"]
]) {
    const r = express.Router();
    const c = crud(tabla);

    r.get("/", roles("Administrador", "Maestro", "Alumno"), c.listar);

    if (tabla === "grupo") {
        r.get("/mis-grupos", roles("Maestro"), misGrupos);
    }

    if (tabla === "grupo") {
        r.patch("/:id/finalizar", roles("Maestro"), cierreController.finalizarGrupo);
        r.patch("/:id/reabrir", roles("Maestro"), cierreController.reabrirGrupo);
    }
    r.get("/:id", roles("Administrador", "Maestro", "Alumno"), c.obtener);
    r.post("/", admin, c.crear);
    r.patch("/:id", admin, c.modificar);

    if (tabla !== "horario") {
        r.patch("/:id/estatus", admin, c.cambiarEstatus);
    }

    router.use(`/${nombre}`, r);
}

// INSCRIPCIONES
const inscripciones = express.Router();

inscripciones.get(
    "/",
    roles("Administrador", "Maestro"),
    ins.listar
);

inscripciones.post(
    "/",
    admin,
    ins.registrar
);
inscripciones.patch("/:id/finalizar", roles("Maestro"), cierreController.finalizarAlumno);
inscripciones.patch("/:id/reabrir", roles("Maestro"), cierreController.reabrirAlumno);

inscripciones.get(
    "/:id",
    roles("Administrador", "Maestro"),
    ins.obtener
);

inscripciones.patch(
    "/:id/estatus",
    admin,
    ins.cambiarEstatus
);

// Consultar el promedio de la vista (no actualiza la columna calificacion_final).
inscripciones.get(
    "/:id/calificacion-final",
    roles("Administrador", "Maestro"),
    ins.consultarCalificacionFinal
);

// Consultar calificaciones
inscripciones.get(
    "/:id/calificaciones",
    roles("Administrador", "Maestro"),
    ins.listarCalificaciones
);

// Registrar o modificar calificaciones: SOLO MAESTRO
inscripciones.put(
    "/:id/calificaciones",
    roles("Maestro"),
    ins.registrarCalificacion
);

router.use("/inscripciones", inscripciones);

module.exports = router;
