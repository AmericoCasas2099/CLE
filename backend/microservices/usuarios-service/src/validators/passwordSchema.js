const { z } = require("zod");

// Reglas adicionales acordadas para CLE. La política solo se aplica al
// establecer contraseñas NUEVAS, nunca al verificar una contraseña en login.
const PALABRAS_PROHIBIDAS = [
    "password", "contrasena", "contraseña", "123456", "qwerty", "admin123"
];

function normalizar(texto) {
    return String(texto || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

function crearPasswordSchema({ correo = "", nombre = "" } = {}) {
    const identificador = String(correo || "").split("@")[0];
    const fragmentos = [
        identificador,
        ...identificador.split(/[._-]/),
        ...String(nombre || "").split(/\s+/)
    ];
    const datosUsuario = [...new Set(fragmentos.map(normalizar))]
        .filter(fragmento => fragmento.length >= 3);

    return z.string()
        .min(8, "La contraseña debe tener al menos 8 caracteres")
        .refine(
            password => Buffer.byteLength(password, "utf8") <= 72,
            "La contraseña no debe superar 72 bytes UTF-8"
        )
        .regex(/[0-9]/, "La contraseña debe contener al menos un número")
        .regex(/[^\p{L}\p{N}\s]/u, "La contraseña debe contener al menos un símbolo especial")
        .superRefine((password, ctx) => {
            const valor = normalizar(password);
            if (PALABRAS_PROHIBIDAS.some(palabra => valor.includes(normalizar(palabra)))) {
                ctx.addIssue({ code: "custom", message: "La contraseña contiene una palabra prohibida" });
            }
            if (datosUsuario.some(dato => valor.includes(dato))) {
                ctx.addIssue({ code: "custom", message: "La contraseña no debe contener el nombre o correo del usuario" });
            }
        });
}

module.exports = { crearPasswordSchema };
