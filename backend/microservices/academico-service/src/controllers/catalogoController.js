const catalogo = require("../repositories/catalogoRepository");

function validarId(req, res) {
  const texto = req.params.id;
  const numero = Number(texto);
  if (!/^[1-9]\d*$/.test(texto) || !Number.isSafeInteger(numero) || numero > 2147483647) {
    res.status(400).json({ error: "ID_INVALIDO", mensaje: "El identificador debe ser un entero positivo" });
    return null;
  }
  return numero;
}

function manejarError(res, error) {
  console.error("Error consultando catálogos académicos:", error);
  return res.status(500).json({ error: "ERROR_INTERNO", mensaje: "No se pudo consultar el catálogo académico" });
}

async function listarIdiomas(_req, res) {
  try { return res.json({ idiomas: await catalogo.listarIdiomas() }); }
  catch (e) { return manejarError(res, e); }
}

async function obtenerIdioma(req, res) {
  const id = validarId(req, res); if (id === null) return;
  try {
    const idioma = await catalogo.obtenerIdioma(id);
    if (!idioma) return res.status(404).json({ error: "IDIOMA_NO_ENCONTRADO" });
    return res.json({ idioma });
  } catch (e) { return manejarError(res, e); }
}

async function listarNiveles(req, res) {
  let idiomaId = null;
  if (req.query.idioma_id !== undefined) {
    if (typeof req.query.idioma_id !== "string" || !/^[1-9]\d*$/.test(req.query.idioma_id)) {
      return res.status(400).json({ error: "IDIOMA_ID_INVALIDO" });
    }
    idiomaId = Number(req.query.idioma_id);
    if (!Number.isSafeInteger(idiomaId) || idiomaId > 2147483647) {
      return res.status(400).json({ error: "IDIOMA_ID_INVALIDO" });
    }
  }
  try { return res.json({ niveles: await catalogo.listarNiveles(idiomaId) }); }
  catch (e) { return manejarError(res, e); }
}

async function obtenerNivel(req, res) {
  const id = validarId(req, res); if (id === null) return;
  try {
    const nivel = await catalogo.obtenerNivel(id);
    if (!nivel) return res.status(404).json({ error: "NIVEL_NO_ENCONTRADO" });
    return res.json({ nivel });
  } catch (e) { return manejarError(res, e); }
}

async function nivelesDeIdioma(req, res) {
  const id = validarId(req, res); if (id === null) return;
  try {
    const idioma = await catalogo.obtenerIdioma(id);
    if (!idioma) return res.status(404).json({ error: "IDIOMA_NO_ENCONTRADO" });
    return res.json({ idioma, niveles: await catalogo.listarNiveles(id) });
  } catch (e) { return manejarError(res, e); }
}

module.exports = {
  listarIdiomas, obtenerIdioma, listarNiveles, obtenerNivel,
  nivelesDeIdioma
};
