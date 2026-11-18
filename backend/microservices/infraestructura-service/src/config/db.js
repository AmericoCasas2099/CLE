
const { Pool } = require("pg");
const fs = require("node:fs");
const path = require("node:path");
require("dotenv").config();

const caPath = path.resolve(
    __dirname,
    "../../certificates/us-east-2-bundle.pem"
);

const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,

    ssl: {
        ca: fs.readFileSync(caPath, "utf8"),
        rejectUnauthorized: true
    },

    connectionTimeoutMillis: 10000
});

module.exports = pool;
