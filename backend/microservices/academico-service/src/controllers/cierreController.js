const { handler, id, fallo } = require('../utils/http');
const cierre = require('../services/cierreService');
const permisos = require('../services/permisosService');
function cuerpoVacio(req) {
  if (req.body && Object.keys(req.body).length) {
    throw fallo(400, 'CUERPO_NO_PERMITIDO', 'Este endpoint no recibe datos en el body');
  }
}
const finalizarAlumno = handler(async (req, res) => {
  cuerpoVacio(req);
  const n = id(req.params.id);
  await permisos.accesoInscripcion(req, n);
  res.json(await cierre.finalizarAlumno(n));
});
const reabrirAlumno = handler(async (req, res) => {
  cuerpoVacio(req);
  const n = id(req.params.id);
  await permisos.accesoInscripcion(req, n);
  res.json(await cierre.reabrirAlumno(n));
});
const finalizarGrupo = handler(async (req, res) => {
  cuerpoVacio(req);
  const n = id(req.params.id);
  await permisos.accesoGrupo(req, n);
  res.json(await cierre.finalizarGrupo(n));
});
const reabrirGrupo = handler(async (req, res) => {
  cuerpoVacio(req);
  const n = id(req.params.id);
  await permisos.accesoGrupo(req, n);
  res.json(await cierre.reabrirGrupo(n));
});
module.exports = { finalizarAlumno, reabrirAlumno, finalizarGrupo, reabrirGrupo };
