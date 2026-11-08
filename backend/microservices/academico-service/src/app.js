
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const pool = require("./config/db");

const app = express();

app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173"
}));
app.use(express.json());

app.get("/health", async (req, res) => {
    try {
        await pool.query("SELECT 1");

        return res.status(200).json({
            servicio: "academico-service",
            estado: "ok",
            base_datos: "conectada"
        });
    } catch (error) {
        console.error("Error de conexión a BD:", error.message);

        return res.status(503).json({
            servicio: "academico-service",
            estado: "error",
            base_datos: "no disponible"
        });
    }
});

app.use((req, res) => {
    return res.status(404).json({
        error: "RUTA_NO_ENCONTRADA",
        mensaje: "La ruta solicitada no existe"
    });
});

module.exports = app;
