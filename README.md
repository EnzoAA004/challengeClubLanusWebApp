# Challenge Club Lanús

Aplicación demo mobile-first para Club Lanús. El monorepo contiene Next.js con App Router, una API Express y PostgreSQL en el proyecto Neon existente.

## Enlaces de entrega

- **Aplicación desplegada (Production):** https://challengeclublanuswebapp.vercel.app/login
- **Repositorio público:** https://github.com/EnzoAA004/challengeClubLanusWebApp


## Funcionalidades incluidas

- **Login demo:** validación de credenciales, sesión persistida en PostgreSQL mediante cookie `HttpOnly`, opción Recordarme y cierre de sesión.
- **Home:** cuenta Granate, saldo en USD y los cuatro movimientos más recientes.
- **Movimientos:** listado real desde PostgreSQL, búsqueda por persona o servicio y filtros por débito automático, recibido o enviado.
- **Detalle:** consulta individual de cada movimiento desde su tarjeta.
- **Estados de interfaz:** carga, error con reintento y lista vacía; navegación mobile-first.

La interfaz toma como referencia el [diseño provisto en Figma](https://www.figma.com/design/GXEt9rIWDil8nQN8ewOrVD/Challenge-t%C3%A9cnico?node-id=0-1). La aplicación y los datos son exclusivamente de demostración; no realiza operaciones bancarias reales.

**Para evaluar:** consultar la URL estable de Production cuando figure en la sección Vercel. Los enlaces Preview requieren autorización de Vercel y no son aptos como enlace público de entrega. Las credenciales de prueba son las especificadas en la consigna de Figma; no se almacenan en el repositorio.

## Requisitos e inicio local

- Node.js 22 o superior y npm 10 o superior.
- Una base PostgreSQL existente en Neon con las migraciones aplicadas.

```bash
npm ci
```

Copiar `backend/.env.example` a `backend/.env` y `frontend/.env.example` a `frontend/.env.local`. Completar las variables privadas del backend con las credenciales de Neon y las credenciales demo. Para una base nueva destinada exclusivamente a esta demo, ejecutar primero `npm run db:migrate` y luego `npm run db:seed`; si la base demo ya está poblada, no es necesario repetirlos. Luego:

```bash
npm run dev
```

Frontend: `http://localhost:3000`. API: `http://localhost:4000`.

## Arquitectura y decisiones

```text
frontend/  Next.js, React, TypeScript, Tailwind CSS y App Router
backend/   Node.js, Express 5, TypeScript, Sequelize 6 y PostgreSQL
```

Los paquetes se administran con npm workspaces desde la raíz. La API valida sesiones guardadas en `auth_sessions`; la cookie `grana_session` es `HttpOnly`, `SameSite=Lax` y `Secure` en producción. PostgreSQL guarda el hash SHA-256 del token, nunca el token de cookie. Las sesiones duran 12 horas o 30 días con Recordarme.

El proxy de Next.js mantiene las llamadas bajo el origen del frontend. Solo reenvía la cookie `grana_session` y encabezados permitidos, y conserva `Set-Cookie` al responder. Esto evita enviar al backend otras cookies del navegador. La API limita el tamaño de JSON y aplica un límite básico de intentos de login por IP; ese contador vive en memoria de cada instancia y deberá pasar a un almacén compartido antes de escalar el backend.

La API usa `DATABASE_URL` pooled para consultas. Las migraciones y el seed usan `DATABASE_URL_UNPOOLED` (directa) cuando está definida. La conexión exige validación TLS completa. El esquema se administra con migraciones versionadas; la aplicación no ejecuta sincronización automática de modelos.

## Variables de entorno

| Variable | Workspace | Uso |
| --- | --- | --- |
| `API_PROXY_URL` | frontend | URL base privada de la API Express. Local: `http://localhost:4000`. |
| `DATABASE_URL` | backend | Conexión pooled de Neon para consultas de la API. |
| `DATABASE_URL_UNPOOLED` | backend | Conexión directa de Neon para migraciones y seed. |
| `CHALLENGE_LOGIN_EMAIL` | backend | Email de la cuenta demo. |
| `CHALLENGE_LOGIN_PASSWORD` | backend | Contraseña de la cuenta demo. |
| `CORS_ORIGIN` | backend | Orígenes permitidos separados por coma. |
| `PORT` | backend | Puerto local de Express; predeterminado `4000`. |

Los ejemplos están en `backend/.env.example` y `frontend/.env.example`. En Vercel, guardar secretos en las variables privadas del proyecto; no versionar archivos `.env`.

## Datos y API

| Tabla | Propósito |
| --- | --- |
| `bank_accounts` | Cuenta demo, saldo y moneda. |
| `bank_movements` | Movimientos asociados a la cuenta demo. |
| `auth_sessions` | Hash del token de sesión, vencimiento y auditoría temporal. |

| Método y ruta | Acceso | Descripción |
| --- | --- | --- |
| `GET /api/health` | Público | Estado de Express. |
| `GET /api/health/db` | Público | Comprueba Neon con `SELECT 1`. |
| `POST /api/auth/login` | Público | Valida credenciales demo y crea sesión. |
| `GET /api/auth/me` | Público | Comprueba sesión vigente. |
| `POST /api/auth/logout` | Público | Revoca sesión y limpia cookie. |
| `GET /api/accounts/demo` | Sesión | Saldo y moneda demo. |
| `GET /api/accounts/demo/movements` | Sesión | Lista movimientos; admite `search`, `type` (`subscription`, `received`, `sent`) y `limit` (1–100). |
| `GET /api/movements/:id` | Sesión | Detalle de un movimiento. |

Migraciones y datos demo:

```bash
npm run db:migrate
npm run db:seed
```

## Verificaciones

```bash
npm run typecheck
npm test
npm run build
```

Las pruebas cubren comparaciones de credenciales y cookies, login, sesiones vigentes/expiradas/revocadas, autorización, validación, límite de intentos, búsqueda, filtros, detalle, respuestas de error y el proxy same-origin. Las pruebas HTTP de la API usan almacenamiento simulado; además se verificaron manualmente los endpoints con la base Neon real.

## Vercel

Se reutilizan los dos proyectos existentes: el frontend usa la raíz `frontend` y el preset Next.js; el backend usa la raíz `backend` y el preset Other, con la configuración de funciones de `backend/vercel.json`. Ambos proyectos usan Node.js 24 y conservan Deployment Protection para Preview.

Configurar variables por entorno en Vercel, sin compartir secretos entre Preview y Production salvo el bypass de Preview que necesita el proxy:

- **Backend:** `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `CHALLENGE_LOGIN_EMAIL`, `CHALLENGE_LOGIN_PASSWORD` y, si hace falta, `CORS_ORIGIN`.
- **Frontend:** `API_PROXY_URL` con el dominio estable del backend para Production; el dominio Preview para Preview. `API_PREVIEW_BYPASS_SECRET` solo se usa en Preview.

El backend exporta Express desde `backend/src/server.ts` y solo abre un puerto en local. La conexión TLS a PostgreSQL valida el certificado y el hostname. Aplicar únicamente migraciones pendientes; no ejecutar `sync` automático. Los enlaces, el procedimiento para continuar en otra PC y los pasos para recuperar Neon están en [CONTINUAR-EN-OTRA-PC.md](CONTINUAR-EN-OTRA-PC.md).

**Production:** [GranaBank — aplicación pública](https://challengeclublanuswebapp.vercel.app/login). Frontend y API desplegados en Vercel desde `main`; los endpoints públicos de salud de la API y la conexión a PostgreSQL respondieron HTTP 200. El flujo completo de login → Home → Movimientos → Detalle → Logout fue comprobado manualmente en Production por el autor del challenge el 20/10/2026.

## Auditoría de dependencias

Verificado el 19 de octubre de 2026 con Node.js 24.11.1 y npm 11.6.2: `npm audit` y `npm audit --omit=dev` reportan cero vulnerabilidades. Se conserva `postcss@8.5.31` para corregir el aviso transitivo de Next 15.5.28. [Aviso de PostCSS](https://github.com/postcss/postcss/security/advisories/GHSA-r28c-9q8g-f849).

El override `uuid@11.1.1` incluye la corrección de seguridad para GHSA-w5hq-g745-h8pq. `npm ls uuid postcss` informa que estos overrides quedan fuera de los rangos que declaran Sequelize 6 (`^8.3.2`) y Next (`8.4.31`). La ejecución en Node.js 24 confirmó que el CommonJS `require` y las funciones `uuid.v1`/`uuid.v4` que Sequelize usa siguen disponibles; la inicialización de modelos, generación UUIDv4 y declaraciones de migración también pasaron con datos y un QueryInterface ficticios. Las pruebas HTTP con datos de prueba pasaron aparte. [Corrección de uuid 11.1.1](https://github.com/uuidjs/uuid/releases/tag/v11.1.1).

## Mejoras posibles

- Sustituir el límite de login en memoria por un almacén compartido al escalar funciones.
- Actualizar Next cuando se pueda validar la migración a una versión con PostCSS corregido.
- Incorporar autenticación real y gestión de usuarios fuera de las credenciales demo del challenge.
- Añadir pruebas end-to-end en Preview y automatizarlas en CI.
