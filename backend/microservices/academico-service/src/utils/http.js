function fallo(status, codigo, mensaje) {
  return Object.assign(new Error(mensaje), { status, codigo });
}
function id(valor) {
  if (!/^[1-9]\d*$/.test(String(valor)) || !Number.isSafeInteger(Number(valor)) || Number(valor) > 2147483647)
    throw fallo(400, "ID_INVALIDO", "El identificador debe ser entero positivo");
  return Number(valor);
}
function parse(schema, data) {
  const r = schema.safeParse(data);
  if (!r.success) {
    const e = fallo(400, "DATOS_INVALIDOS", "Revisa los datos enviados");
    e.detalles = r.error.issues.map(i => ({ campo: i.path.join("."), mensaje: i.message }));
    throw e;
  }
  return r.data;
}
function handler(fn) {
  return (req,res,next) => Promise.resolve(fn(req,res)).catch(next);
}
module.exports = { fallo, id, parse, handler };
