const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const notFoundMiddleware = require(
    "./middlewares/notFoundMiddleware"
);

const errorMiddleware = require(
    "./middlewares/errorMiddleware"
);

const app = express();

app.use(helmet());

app.use(cors({
    origin: process.env.FRONTEND_URL ||
        "http://localhost:5173"
}));

app.use(express.json({
    limit: "100kb"
}));

app.get("/health", (req, res) => {
    res.status(200).json({
        servicio: "usuarios-service",
        estado: "ok"
    });
});

// Aquí registraremos las rutas reales
// app.use("/api/v1/auth", authRoutes);
// app.use("/api/v1/usuarios", usuarioRoutes);

// Ruta inexistente
app.use(notFoundMiddleware);

// Manejo de errores
app.use(errorMiddleware);

module.exports = app;