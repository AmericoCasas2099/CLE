require("dotenv").config();
const pool = require("./db");

async function main() {
    try {
        const { rows } = await pool.query(`
            SELECT current_database() AS base_datos,
                   current_user AS usuario,
                   current_schema() AS esquema
        `);
        console.log("Conexión exitosa a PostgreSQL");
        console.table(rows);
    } catch (error) {
        console.error("Error al conectar:", error.message);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}
main();
