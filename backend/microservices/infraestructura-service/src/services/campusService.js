const repo = require("../repositories/campusRepository");
const { errorHttp } = require("../utils");
async function obtener(id) {
  const campus = await repo.obtener(id);
  if (!campus) throw errorHttp(404,"CAMPUS_NO_ENCONTRADO","El campus no existe");
  return campus;
}
async function modificar(id, datos) {
  await obtener(id);
  return repo.modificar(id, datos);
}
async function cambiarEstatus(id, estatus) {
  await obtener(id);
  return repo.cambiarEstatus(id, estatus);
}
module.exports = { crear: repo.crear, listar: repo.listar, obtener, modificar, cambiarEstatus };
