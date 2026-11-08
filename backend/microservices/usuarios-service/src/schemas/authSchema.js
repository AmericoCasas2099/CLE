const { z } = require("zod");

const loginSchema = z.object({
    correo: z.string()
        .trim().email(),

    password: z.string()
        .min(1, "La contraseña es obligatoria")
}).strict();

const cambiarPasswordSchema = z.object({
    password_actual: z.string()
        .min(1, "La contraseña actual es obligatoria"),

    password_nueva: z.string()
        .min(8, "La nueva contraseña debe tener al menos 8 caracteres")
        .refine(
            valor => Buffer.byteLength(valor, "utf8") <= 72,
            "La contraseña no debe superar 72 bytes UTF-8"
        )
}).strict().refine(
    datos => datos.password_actual !== datos.password_nueva,
    {
        message: "La nueva contraseña debe ser diferente a la actual",
        path: ["password_nueva"]
    }
);


module.exports = {
    loginSchema,
    cambiarPasswordSchema,
};