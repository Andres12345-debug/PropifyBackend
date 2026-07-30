# Propify Backend

Backend de Propify: NestJS + PostgreSQL (TypeORM), construido sobre una base endurecida a partir del proyecto "Ventanilla Única". Trae ya resueltos los problemas de seguridad típicos de un backend nuevo: CORS abierto, guards ausentes, errores internos filtrados al cliente, hashes síncronos bloqueando el event loop, logins sin auditar, JWT sin forma de revocarse.

## Instalación

```bash
npm install
cp .env.example .env
```

Edita `.env` con tus valores reales. **Genera tu propio secreto** (no copies el placeholder):

```bash
openssl rand -base64 48
```

Pega el resultado en `CLAVE_SECRETA`.

## Arrancar en desarrollo

```bash
npm run start:dev
```

Necesitas una base PostgreSQL accesible con los datos de `DB_*` en `.env`. Con `synchronize` activo en desarrollo (ver más abajo), TypeORM crea las tablas solo al arrancar; no hace falta correr migraciones para empezar a probar.

Al arrancar, `SeedService` crea automáticamente los roles base `admin` y `usuario`. Si defines `SEED_ADMIN_EMAIL` (y opcionalmente `SEED_ADMIN_PASSWORD`), también crea un usuario admin de arranque.

## Arquitectura

```
src/
├── main.ts                     # bootstrap: helmet, CORS, ValidationPipe, GlobalExceptionFilter
├── app.module.ts
├── config/
│   ├── conexion/conexion.module.ts   # DataSource TypeORM (@Global), SnakeNamingStrategy
│   └── env.validation.ts             # esquema Joi — falla rápido si falta una env var
├── middleware/
│   ├── filtros/global-exception.filter.ts   # oculta detalle interno en 5xx
│   └── seguridad/                    # @Global — todo lo transversal de auth
│       ├── seguridad.module.ts
│       ├── token-revocation.service.ts   # blacklist de JWT (logout) vía tabla revoked_tokens
│       ├── rol.helper.ts                 # RoleNames, esAdmin, tieneRol, obtenerUsuarioId
│       ├── decoradores/roles.decorator.ts    # @Roles(...)
│       └── guardianes/
│           ├── auth.interface.ts     # SesionUsuario, RequestConUsuario
│           ├── jwt.guard.ts          # valida JWT (HS256), chequea revocación
│           └── roles.guard.ts        # autorización por rol vía Reflector
├── modelos/                     # entidades TypeORM, una carpeta por entidad
│   ├── usuario/ rol/ acceso/ propiedad/
│   └── audit/ access-log.ts, password-reset-token.ts, revoked-token.ts
├── modulos/
│   ├── publico/                 # sin JwtGuard — prefijo de ruta /publico
│   │   ├── accesos/             # login/logout
│   │   ├── registros/           # signup, recuperar/cambiar password
│   │   └── correo/              # nodemailer
│   └── privado/                 # con JwtGuard (+ RolesGuard) — prefijo /privado
│       ├── usuarios/ roles/ propiedades/
└── utilidades/compartido/
    ├── generarToken.ts           # firma JWT: jti, sub, name, nombre_rol
    └── seed.service.ts           # roles base + admin opcional
```

## Qué ya está resuelto (no lo vuelvas a implementar)

- **Helmet + CORS restringido** a `FRONTEND_URL`.
- **ValidationPipe global** (`whitelist`, `forbidNonWhitelisted`, `transform`): cualquier campo no declarado en un DTO es rechazado, y los tipos se coaccionan automáticamente.
- **GlobalExceptionFilter**: en errores 5xx nunca se filtra el detalle interno al cliente; en 4xx (HttpException) se devuelve el mensaje tal cual.
- **JwtGuard + RolesGuard + `@Roles()`**: autenticación y autorización por rol. El JWT se valida con algoritmo fijo (`HS256`) y cada token lleva un `jti` único que permite revocarlo en logout.
- **Revocación de tokens** (`POST /publico/auth/logout`): el `jti` del token se guarda en `revoked_tokens` hasta su expiración; `JwtGuard` lo rechaza aunque la firma sea válida. Limpieza automática de expirados cada hora.
- **Throttler** global (100 req/min por IP) y límites más estrictos en endpoints públicos sensibles (`/auth/login`, `/registros/user`, `/registros/recuperar-password`, `/registros/nueva-password`).
- **bcrypt async a costo 12** (nunca `hashSync`/`compareSync`, que bloquean el event loop).
- **Mitigación de enumeración por temporización en login**: cuando el correo no existe, se compara igual contra un hash bcrypt fijo (`DUMMY_HASH`) para que la respuesta tarde lo mismo que un password incorrecto.
- **Rate limiting de login en memoria** por correo e IP (5 intentos / 15 min), con limpieza periódica para no crecer indefinidamente.
- **Auditoría de accesos** (`access_logs`, FK real a `usuarios` con `onDelete: SET NULL`): cada login, registro, reset y cambio de contraseña queda registrado con IP y user-agent reales de la petición.
- **Reset de contraseña de un solo uso**: token UUID con expiración de 15 minutos; al pedir uno nuevo, los anteriores del mismo usuario se invalidan.
- **Rol nunca viene del cliente en el autorregistro**: `POST /publico/registros/user` siempre asigna el rol `usuario` server-side; solo un admin puede asignar roles vía `POST /privado/usuarios`.
- **Validación de entorno con Joi**: si falta una variable requerida, la app no arranca.

## Módulos de ejemplo

- `usuarios` + `roles` + `accesos` (login/logout) + `registros` (signup/reset): el flujo de auth completo.
- `propiedades`: módulo de dominio de Propify (CRUD de inmuebles) — demuestra el patrón de "dueño del recurso" (solo el creador o un admin pueden editar/eliminar), vía `esAdmin`/`obtenerUsuarioId` de `rol.helper.ts`.

El login es por **correo + contraseña** (`correoUsuario` / `claveAcceso`).

## Cómo agregar un módulo de dominio nuevo

Sigue el patrón de `propiedades`:

```
modulos/privado/<entidad>/
  <entidad>.module.ts
  <entidad>.controller.ts   # GET /, GET /:id, POST /, PUT /:id, DELETE /:id (sin sufijos redundantes)
  <entidad>.service.ts      # inyecta DataSource, obtén un Repository
  dto/
    crear-<entidad>.dto.ts
    actualizar-<entidad>.dto.ts
modelos/<entidad>/<entidad>.ts   # entidad TypeORM — regístrala en conexion.module.ts
```

Protege con guards lo que no deba ser público:

```ts
@UseGuards(JwtGuard, RolesGuard)
@Roles(RoleNames.ADMIN)
```

## Cosas a revisar antes de producción

- **`synchronize`** está atado a `NODE_ENV !== 'production'` en `conexion.module.ts`: crea/ajusta tablas automáticamente en desarrollo, pero en producción debes pasarte a migraciones de TypeORM antes de tener datos reales que proteger.
- El rate-limit de login y la blacklist de tokens revocados usan estructuras en memoria/DB pensadas para una sola instancia. Si despliegas varias réplicas, el rate-limit en memoria debe moverse a Redis (la revocación por `jti` ya vive en DB y sí escala a varias réplicas).
- Revisa el branding del correo de reset (`registros.service.ts`, `generarPlantillaCorreo`) y el remitente en `.env`.

## Variables de entorno

Ver `.env.example`. Si no necesitas el módulo de correo (reset de contraseña por email), puedes eliminar `CorreoModule`, las claves `MAIL_*` de `.env.example` y del esquema Joi, y la dependencia `nodemailer` de `package.json`.
