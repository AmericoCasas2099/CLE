// Solo agrega datos descriptivos. Los IDs y los permisos permanecen bajo el
// control de inscripciones-service. La indisponibilidad de una fuente externa
// nunca autoriza operaciones ni modifica lo almacenado.
const repo = require('../repositories/baseRepository');

const TIEMPO_ESPERA_MS = 3000;
const MAX_IDS_POR_SOLICITUD = 100;

function identificadores(grupos, campo) {
  return [...new Set(grupos.map(g => Number(g[campo])).filter(n => Number.isSafeInteger(n) && n > 0))];
}

function direccion(base, ruta) {
  if (!base) throw Object.assign(new Error('Servicio no configurado'), { codigo: 'SERVICIO_NO_CONFIGURADO' });
  return `${base.replace(/\/$/, '')}${ruta}`;
}

async function consultarJson(url, token) {
  let respuesta;
  try {
    respuesta = await fetch(url, {
      headers: { Authorization: token },
      signal: AbortSignal.timeout(TIEMPO_ESPERA_MS)
    });
  } catch {
    throw Object.assign(new Error('No se pudo consultar al microservicio'), { codigo: 'SERVICIO_NO_DISPONIBLE' });
  }
  if (!respuesta.ok) {
    const codigo = respuesta.status === 401 ? 'TOKEN_RECHAZADO' :
      respuesta.status === 403 ? 'ACCESO_DENEGADO' :
      respuesta.status === 404 ? 'RECURSO_NO_ENCONTRADO' : 'ERROR_SERVICIO_EXTERNO';
    throw Object.assign(new Error(`El servicio respondió HTTP ${respuesta.status}`), { codigo });
  }
  try { return await respuesta.json(); } catch {
    throw Object.assign(new Error('Respuesta JSON inválida'), { codigo: 'RESPUESTA_INVALIDA' });
  }
}

function advertencia(servicio, error) {
  const codigo = error?.codigo || 'SERVICIO_NO_DISPONIBLE';
  const mensajes = {
    SERVICIO_NO_CONFIGURADO: `No se configuró la dirección de ${servicio}.`,
    SERVICIO_NO_DISPONIBLE: `No se pudo consultar al microservicio ${servicio}.`,
    TOKEN_RECHAZADO: `${servicio} rechazó la sesión al consultar información complementaria.`,
    ACCESO_DENEGADO: `No hay permisos para consultar información complementaria de ${servicio}.`,
    RECURSO_NO_ENCONTRADO: `El recurso solicitado no existe en ${servicio}.`,
    RESPUESTA_INVALIDA: `${servicio} devolvió una respuesta inesperada.`,
    ERROR_SERVICIO_EXTERNO: `No se pudo obtener información complementaria de ${servicio}.`
  };
  return { servicio, codigo, mensaje: mensajes[codigo] || mensajes.ERROR_SERVICIO_EXTERNO };
}

async function obtenerResumenAcademico(grupos, authorization) {
  const maestros = identificadores(grupos, 'maestro_id');
  const niveles = identificadores(grupos, 'nivel_id');
  if (!maestros.length && !niveles.length) return { maestros: [], niveles: [] };
  // Los detalles personales se reducen en academico-service a nombre/apellidos.
  const params = new URLSearchParams({
    maestro_ids: maestros.join(','),
    nivel_ids: niveles.join(',')
  });
  const url = direccion(process.env.ACADEMICO_SERVICE_URL,
    `/api/v1/catalogos/resumen-grupos?${params.toString()}`);
  const datos = await consultarJson(url, authorization);
  if (!Array.isArray(datos.maestros) || !Array.isArray(datos.niveles)) {
    throw Object.assign(new Error('Respuesta de catálogos inválida'), { codigo: 'RESPUESTA_INVALIDA' });
  }
  return datos;
}

async function obtenerResumenCampus(grupos, authorization) {
  const ids = identificadores(grupos, 'campus_id');
  const resultado = new Map();
  const fallos = [];
  // Se limita la concurrencia y se consulta una vez por campus, no una por grupo.
  for (let inicio = 0; inicio < ids.length; inicio += 8) {
    const lote = ids.slice(inicio, inicio + 8);
    const consultas = await Promise.allSettled(lote.map(async campusId => {
      const url = direccion(process.env.INFRAESTRUCTURA_SERVICE_URL,
        `/api/v1/campus/${campusId}`);
      const json = await consultarJson(url, authorization);
      if (!json.campus || Number(json.campus.campus_id) !== campusId) {
        throw Object.assign(new Error('Campus inválido'), { codigo: 'RESPUESTA_INVALIDA' });
      }
      return json.campus;
    }));
    consultas.forEach((item, i) => {
      if (item.status === 'fulfilled') resultado.set(lote[i], item.value);
      else fallos.push(item.reason);
    });
  }
  return { campusPorId: resultado, fallos };
}

async function enriquecerGrupos(grupos, authorization) {
  if (!grupos.length) return { grupos: [], advertencias: [] };
  if (grupos.length > MAX_IDS_POR_SOLICITUD) throw Error('La paginación supera el máximo permitido');

  // Los periodos se obtienen de la BD propia. Si falla, no es una consulta
  // complementaria externa: se deja que el error llegue al middleware global.
  const periodosId = identificadores(grupos, 'periodo_id');
  const periodosQuery = await repo.pool.query(
    'SELECT periodo_id, nombre, fecha_inicio, fecha_fin, estatus FROM public.periodo WHERE periodo_id = ANY($1::int[])',
    [periodosId]
  );
  const periodosPorId = new Map(periodosQuery.rows.map(p => [Number(p.periodo_id), p]));

  const [academicoR, infraestructuraR] = await Promise.allSettled([
    obtenerResumenAcademico(grupos, authorization),
    obtenerResumenCampus(grupos, authorization)
  ]);
  const advertencias = [];
  let maestrosPorId = new Map(), nivelesPorId = new Map(), campusPorId = new Map();

  if (academicoR.status === 'fulfilled') {
    maestrosPorId = new Map(academicoR.value.maestros.map(m => [Number(m.maestro_id), m]));
    nivelesPorId = new Map(academicoR.value.niveles.map(n => [Number(n.nivel_id), n]));
  } else advertencias.push(advertencia('academico-service', academicoR.reason));

  if (infraestructuraR.status === 'fulfilled') {
    campusPorId = infraestructuraR.value.campusPorId;
    if (infraestructuraR.value.fallos.length) {
      const codigos = new Set(infraestructuraR.value.fallos.map(e => e?.codigo || 'SERVICIO_NO_DISPONIBLE'));
      for (const codigo of codigos) advertencias.push(advertencia('infraestructura-service', { codigo }));
    }
  } else advertencias.push(advertencia('infraestructura-service', infraestructuraR.reason));

  return {
    grupos: grupos.map(g => ({
      ...g,
      maestro: maestrosPorId.get(Number(g.maestro_id)) ?? null,
      nivel: nivelesPorId.get(Number(g.nivel_id)) ?? null,
      campus: campusPorId.get(Number(g.campus_id)) ?? null,
      periodo: periodosPorId.get(Number(g.periodo_id)) ?? null
    })),
    advertencias
  };
}

module.exports = { enriquecerGrupos };
