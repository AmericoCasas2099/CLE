# CLE usuarios-service — versión integrada

Incluye `auth` y CRUD de usuarios, más catálogos consultados desde `usuarioRepository` (sin `catalogoRepository.js` ni `catalogoController.js`). Las rutas `/roles` y `/estatus-usuarios` se registran en `app.js`; no hay archivos de catálogos separados.

## Instalación

En `backend/microservices/usuarios-service`:

```powershell
npm install
Copy-Item .env.example .env
```

Configura `.env` sin publicar contraseñas. Para `JWT_SECRET`, genera un secreto aleatorio, por ejemplo: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.

Descarga el bundle CA de Ohio a `certificates/us-east-2-bundle.pem`:

```powershell
New-Item -ItemType Directory -Force certificates
Invoke-WebRequest -Uri "https://truststore.pki.rds.amazonaws.com/us-east-2/us-east-2-bundle.pem" -OutFile "certificates/us-east-2-bundle.pem"
```

No se incluyen certificados ni claves privadas en el ZIP. El certificado PEM indicado es público.

Prueba la conexión: `node src/config/testConnection.js`. Inicia API: `npm run dev`.

## Requisitos SQL

Deben existir en esquema `public`: `usuario`, `rol`, `estatus_usuario`, con las columnas confirmadas. `usuario.usuario_id` ya es IDENTITY y `fecha_creacion` tiene CURRENT_TIMESTAMP. Los catálogos deben incluir exactamente `Administrador`, `Maestro`, `Alumno`, `activo`, `inactivo`.

Verifica restricciones (imprescindibles para prevenir identificadores duplicados):

```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.usuario'::regclass;
```

`identificador_acceso` debe tener restricción UNIQUE. Los IDs de `rol` y `estatus_usuario` deben tener PK. No necesitas cambiar la propiedad IDENTITY de `usuario_id`.

## Crear primer administrador (solo si tabla usuario está vacía)

En PowerShell:

```powershell
$env:BOOTSTRAP_ADMIN_IDENTIFIER = 'admin_cle'
$secure = Read-Host 'Contraseña del admin' -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
  $env:BOOTSTRAP_ADMIN_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  npm run bootstrap:admin
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
  Remove-Item Env:BOOTSTRAP_ADMIN_PASSWORD -ErrorAction SilentlyContinue
  Remove-Item Env:BOOTSTRAP_ADMIN_IDENTIFIER -ErrorAction SilentlyContinue
  Remove-Variable secure,ptr -ErrorAction SilentlyContinue
}
```

El script se niega a crear administradores cuando existen usuarios y no expone una ruta pública de registro.

## Endpoints

- POST `/api/v1/auth/login` público
- GET `/api/v1/auth/perfil` autenticado
- POST `/api/v1/usuarios` Administrador
- GET `/api/v1/usuarios?pagina=1&limite=20` Administrador
- GET `/api/v1/usuarios/:usuarioId` Administrador
- PUT `/api/v1/usuarios/:usuarioId` Administrador
- PATCH `/api/v1/usuarios/:usuarioId/estatus` Administrador
- GET `/api/v1/roles` Administrador
- GET `/api/v1/estatus-usuarios` Administrador

La respuesta de lista tiene `{usuarios, total, pagina, limite}`. Revisa que coincida con tu OpenAPI y ajusta contrato o implementación antes de integrar frontend. Falta implementar `PUT /api/v1/auth/cambiar-password`; no se declara terminado aquí.

## Consideraciones

- `password_hash` no aparece en respuestas.
- `authMiddleware` reconsulta estatus y rol desde PostgreSQL antes de autorizar.
- Las claves de SQL dinámicas son valores parametrizados.
- No subas `.env`; `.env.example` sí puede ir a Git.
- Al integrar Docker, cambia la ruta del certificado o cópialo en la imagen.
- El bloqueo de último administrador activo se coordina con las operaciones que usan este service, no impide SQL externo.
- Reemplaza el bloqueo de tasa en memoria por almacenamiento compartido si despliegas varias réplicas.
- Para la política de contraseñas, bcrypt clásico limita a 72 bytes UTF-8, no 72 caracteres.
