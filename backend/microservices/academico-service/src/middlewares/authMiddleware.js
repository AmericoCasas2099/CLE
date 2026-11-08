const jwt = require("jsonwebtoken");

function authMiddleware(req, res, next) {
  const autorizacion = req.headers.authorization || "";
  const [tipo, token] = autorizacion.split(" ");
  if (tipo !== "Bearer" || !token) {
    return res.status(401).json({ error: "TOKEN_REQUERIDO" });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
      issuer: "cle-usuarios-service",
      audience: "cle-api"
    });
    req.auth = payload;
    next();
  } catch {
    return res.status(401).json({ error: "TOKEN_INVALIDO" });
  }
}

module.exports = authMiddleware;
