const jwt = require("jsonwebtoken");
const { fallo } = require("../utils/http");
module.exports = async (req,res,next) => {
  const [tipo,token] = (req.headers.authorization || "").split(" ");
  if (tipo !== "Bearer" || !token) return next(fallo(401,"TOKEN_REQUERIDO","Falta JWT Bearer"));
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms:["HS256"], issuer:"cle-usuarios-service", audience:"cle-api" });
    if (!Number.isSafeInteger(Number(payload.sub)) || Number(payload.sub) < 1 || !["Administrador","Maestro","Alumno"].includes(payload.rol))
      throw new Error("Claims inválidos");
  } catch { return next(fallo(401,"TOKEN_INVALIDO","Token inválido o expirado")); }
  if (process.env.VERIFICAR_REVOCACION === "true") {
    try {
      const base = process.env.USUARIOS_SERVICE_URL;
      const r = await fetch(`${base}/internal/auth/validar-token`, { headers: {Authorization:`Bearer ${token}`}, signal:AbortSignal.timeout(3000) });
      if (r.status === 401) return next(fallo(401,"TOKEN_REVOCADO_O_INVALIDO","Sesión inválida"));
      if (r.status !== 204) return next(fallo(503,"AUTENTICACION_NO_DISPONIBLE","No fue posible validar la sesión"));
    } catch { return next(fallo(503,"AUTENTICACION_NO_DISPONIBLE","No fue posible validar la sesión")); }
  }
  req.auth=payload;
  next();
};
