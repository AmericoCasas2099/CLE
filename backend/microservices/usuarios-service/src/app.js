const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const authRoutes = require("./routes/authRoutes");
const usuarioRoutes = require("./routes/usuarioRoutes");
const notFoundMiddleware = require("./middlewares/notFoundMiddleware");
const errorMiddleware = require("./middlewares/errorMiddleware");

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || "https://cledisenioprueba.vercel.app" }));
app.use(express.json({ limit: "100kb" }));

app.get("/health", (req, res) => res.status(200).json({ servicio: "usuarios-service", estado: "ok" }));
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/usuarios", usuarioRoutes);
const authMiddleware = require("./middlewares/authMiddleware");
const roleMiddleware = require("./middlewares/roleMiddleware");
const usuarioController = require("./controllers/usuarioController");
app.get("/api/v1/roles", authMiddleware, roleMiddleware("Administrador"), usuarioController.obtenerRoles);
app.get("/api/v1/estatus-usuarios", authMiddleware, roleMiddleware("Administrador"), usuarioController.obtenerEstatus);
app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports = app;
