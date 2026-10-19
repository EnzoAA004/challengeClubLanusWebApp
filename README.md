# Challenge Club Lanús

Aplicación demo mobile-first para Club Lanús. El monorepo contiene Next.js con App Router, una API Express y PostgreSQL en el proyecto Neon existente.

## Requisitos e inicio local

- Node.js 22 o superior y npm 10 o superior.
- Una base PostgreSQL existente en Neon con las migraciones aplicadas.

```bash
npm ci
```

Copiar `backend/.env.example` a `backend/.env` y `frontend/.env.example` a `frontend/.env.local`. Completar las variables privadas del backend con las credenciales de Neon y las credenciales demo. Luego:

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

## Vercel Preview

Configurar dos proyectos conectados al repositorio:

1. **Frontend:** raíz `frontend`, preset Next.js, directorio de salida predeterminado y `API_PROXY_URL` con el dominio Preview del backend.
2. **Backend:** raíz `backend`, preset Express (fijado en `backend/vercel.json`). Configurar como privadas `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `CHALLENGE_LOGIN_EMAIL`, `CHALLENGE_LOGIN_PASSWORD` y, si hace falta, `CORS_ORIGIN`.

El backend exporta Express desde `backend/src/server.ts` y solo escucha un puerto en local. Correr migraciones con la URL directa antes de probar una base nueva. Para esta etapa, usar únicamente el entorno Preview; no promover a producción.

El proyecto Vercel anterior fallaba porque usaba preset **Other**, raíz vacía y buscaba `public`. Se configuraron los proyectos web y API para Preview. La API usa `backend/vercel.json`; su runtime incluye explícitamente el driver `pg` para que Sequelize lo resuelva en Vercel. El frontend reenvía el secreto Preview-only `API_PREVIEW_BYPASS_SECRET` a la API protegida, y `API_PROXY_URL` apunta al despliegue actual. Ambos deployments usan protección de acceso de Vercel. Los enlaces, el procedimiento para continuar en otra PC y los pasos para recuperar Neon están en [CONTINUAR-EN-OTRA-PC.md](CONTINUAR-EN-OTRA-PC.md).

## Auditoría de dependencias

Al 19 de octubre de 2026, `npm audit` y `npm audit --omit=dev` reportan cuatro incidencias transitivas: tres moderadas y una alta. `next@15.5.28` fija `postcss@8.4.31`; el parche de PostCSS está en `8.5.23` o posterior, pero el grafo npm actual no lo resuelve como override desde el workspace. El arreglo que npm ofrece para Next es `16.4.2`, un salto mayor; no se aplicó para evitar una actualización incompatible sin migración y pruebas dedicadas. [Aviso de PostCSS](https://github.com/postcss/postcss/security/advisories/GHSA-r28c-9q8g-f849).

`sequelize@6.37.8` trae `uuid@8.3.2`; el aviso afecta `v3`, `v5` y `v6` cuando se pasa un buffer. Sequelize en este proyecto usa `v1` y `v4`, sin buffer, así que esa ruta vulnerable no se ejecuta aquí. Npm no ofrece una actualización compatible de Sequelize para resolverla; no se forzó un cambio mayor. [Aviso de uuid](https://github.com/uuidjs/uuid/security/advisories/GHSA-w5hq-g745-h8pq).

## Mejoras posibles

- Sustituir el límite de login en memoria por un almacén compartido al escalar funciones.
- Actualizar Next cuando se pueda validar la migración a una versión con PostCSS corregido.
- Incorporar autenticación real y gestión de usuarios fuera de las credenciales demo del challenge.
- Añadir pruebas end-to-end en Preview y automatizarlas en CI.
