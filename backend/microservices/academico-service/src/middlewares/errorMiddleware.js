module.exports = (err,req,res,next) => {
  const erroresDB = {
    "23505":[409,"REGISTRO_DUPLICADO","El registro ya existe"],
    "23503":[400,"REFERENCIA_INVALIDA","La referencia no existe en esta base de datos"],
    "23514":[400,"REGLA_INVALIDA","Se incumple una restricción de datos"],
    "23502":[400,"CAMPO_OBLIGATORIO","Falta un campo obligatorio"],
    "22001":[400,"LONGITUD_INVALIDA","El valor supera el tamaño permitido"],
    "22P02":[400,"FORMATO_INVALIDO","Formato no válido"],
    "22007":[400,"FECHA_INVALIDA","Fecha u hora no válida"]
  };
  const d=erroresDB[err.code];
  if(d) return res.status(d[0]).json({error:d[1],mensaje:d[2]});
  if(err.status) return res.status(err.status).json({error:err.codigo,mensaje:err.message,...(err.detalles?{detalles:err.detalles}:{})});
  console.error("Error interno inscripciones:",err);
  return res.status(500).json({error:"ERROR_INTERNO",mensaje:"Ocurrió un error interno"});
};
