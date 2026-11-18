const repo = require("../repositories/salonRepository");
const campusRepo = require("../repositories/campusRepository");
const { errorHttp } = require("../utils");
async function validarCampus(campusId) {
  const campus = await campusRepo.obtener(campusId);
  if (!campus) throw errorHttp(400,"CAMPUS_INVALIDO","El campus indicado no existe");
  if (campus.estatus !== "Activo") throw errorHttp(400,"CAMPUS_INACTIVO","No es posible asignar el salón a un campus inactivo");
}
async function obtener(id) {
  const salon = await repo.obtener(id);
  if (!salon) throw errorHttp(404,"SALON_NO_ENCONTRADO","El salón no existe");
  return salon;
}
async function crear(datos) {
  await validarCampus(datos.campus_id);
  return repo.crear(datos);
}
async function modificar(id, datos) {
  await obtener(id);
  if (datos.campus_id !== undefined) await validarCampus(datos.campus_id);
  return repo.modificar(id,datos);
}
async function cambiarEstatus(id, estatus) {
  const salon = await obtener(id);
  if (estatus === 'Activo') await validarCampus(salon.campus_id);
  return repo.cambiarEstatus(id, estatus);
}
module.exports = { crear, listar: repo.listar, obtener, modificar, cambiarEstatus };
