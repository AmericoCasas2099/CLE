const express = require("express");
const rateLimit = require("express-rate-limit");
const authController = require("../controllers/authController");
const authMiddleware = require("../middlewares/authMiddleware");
const validateMiddleware = require("../middlewares/validateMiddleware");
const {loginSchema,cambiarPasswordSchema } = require("../schemas/authSchema");


const router = express.Router();
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: { codigo: "DEMASIADOS_INTENTOS", mensaje: "Inténtalo más tarde" } }
});

router.post("/login", loginLimiter, validateMiddleware(loginSchema), authController.login);
router.get("/perfil", authMiddleware, authController.perfil);
router.put("/cambiar-password",authMiddleware,validateMiddleware(cambiarPasswordSchema),authController.cambiarPassword);
router.patch("/perfil",authMiddleware,authController.actualizarCorreo);
module.exports = router;
