const { z } = require("zod");

function validar(esquema, valor) {
  const result = esquema.safeParse(valor);
  if (!result.success) {
    const error = new Error("Datos inválidos");
    error.codigo = "VALIDACION_ERROR";
    error.status = 400;
    error.detalles = result.error.issues.map(issue => ({
      campo: issue.path.join("."), mensaje: issue.message
    }));
    throw error;
  }
  return result.data;
}
function idPositivo(texto) {
  if (!/^[1-9][0-9]*$/.test(String(texto))) {
    const error = new Error("El identificador debe ser un entero positivo");
    error.codigo = "ID_INVALIDO";
    error.status = 400;
    throw error;
  }
  const id = Number(texto);
  if (!Number.isSafeInteger(id) || id > 2147483647) {
    const error = new Error("El identificador está fuera del rango permitido");
    error.codigo = "ID_INVALIDO";
    error.status = 400;
    throw error;
  }
  return id;
}
function errorHttp(status, codigo, mensaje) {
  return Object.assign(new Error(mensaje), { status, codigo });
}
module.exports = { z, validar, idPositivo, errorHttp };
