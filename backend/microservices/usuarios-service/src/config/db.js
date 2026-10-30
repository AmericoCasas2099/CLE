const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const ssl = process.env.DB_SSL === "true"
    ? {
        ca: fs.readFileSync(
            path.resolve(process.cwd(), process.env.DB_CA_PATH || "certificates/us-east-2-bundle.pem"),
            "utf8"
        ),
        rejectUnauthorized: true
    }
    : false;

const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
});

module.exports = pool;
