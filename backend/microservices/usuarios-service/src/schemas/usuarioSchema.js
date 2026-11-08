const { z } = require("zod");

const passwordSegura = z.string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .refine(valor => Buffer.byteLength(valor, "utf8") <= 72,
        "La contraseña no debe superar 72 bytes UTF-8");

const correo = z.union([
    z.email("Correo electrónico inválido").max(150),
    z.null()
]);

const crearUsuarioSchema = z.object({
    correo: correo,
    password: passwordSegura,
    rol_id: z.number().int().positive()
}).strict();

const actualizarUsuarioSchema = z.object({
    correo: z.email({
        error: "Correo electrónico inválido"
    })
    .max(150, "Máximo 150 caracteres")
}).strict();

const cambiarEstatusSchema = z.object({
    estatus: z.enum(["Activo", "Inactivo"])
}).strict();

const cambiarRolSchema = z.object({
    rol_id: z.number()
        .int("El rol debe ser un número entero")
        .positive("El ID del rol debe ser positivo")
}).strict();

const listarUsuariosSchema = z.object({
    pagina: z.coerce.number().int().min(1).default(1),
    limite: z.coerce.number().int().min(1).max(100).default(20)
});

module.exports = {
    crearUsuarioSchema,
    actualizarUsuarioSchema,
    cambiarEstatusSchema,
    cambiarRolSchema,
    listarUsuariosSchema
};
