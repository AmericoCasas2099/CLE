require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const pool = require("./config/db");
const maestroRoutes = require("./routes/maestroRoutes");
const alumnoRoutes = require("./routes/alumnoRoutes");

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || "https://cledisenioprueba.vercel.app" }));
app.use(express.json());

app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.status(200).json({ servicio: "academico-service", estado: "ok", base_datos: "conectada" });
  } catch {
    res.status(503).json({ servicio: "academico-service", estado: "error", base_datos: "no disponible" });
  }
});

app.use("/api/v1/maestros", maestroRoutes);
app.use("/api/v1/alumnos", alumnoRoutes);
app.use((_req, res) => res.status(404).json({ error: "RUTA_NO_ENCONTRADA" }));
module.exports = app;
