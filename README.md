# Challenge Club Lanús

Monorepo de la aplicación Granate, con una interfaz web mobile-first, una API Express y PostgreSQL en Neon.

## Requisitos

- Node.js 22 o superior
- npm 10 o superior
- Una base PostgreSQL existente en Neon

## Inicio local

1. Instalar dependencias desde la raíz:

   ```bash
   npm install
   ```

2. Copiar `backend/.env.example` a `backend/.env`, completar la URL pooled de Neon en `DATABASE_URL`, la URL directa en `DATABASE_URL_UNPOOLED` y configurar `CHALLENGE_LOGIN_EMAIL` y `CHALLENGE_LOGIN_PASSWORD` con las credenciales de prueba. Copiar `frontend/.env.example` a `frontend/.env.local`.
3. Iniciar frontend y API:

   ```bash
   npm run dev
   ```

   Frontend: `http://localhost:3000`. API: `http://localhost:4000`.

## Scripts

- `npm run dev`: inicia frontend y backend en paralelo.
- `npm run build`: compila backend y frontend.
- `npm run typecheck`: verifica los tipos TypeScript de ambos workspaces.
- `npm run db:migrate`: aplica las migraciones pendientes de forma transaccional y versionada.
- `npm run db:seed`: crea o actualiza los datos de demostración sin duplicar movimientos.

## API

- `GET /api/health`: estado del servidor.
- `GET /api/health/db`: verifica PostgreSQL ejecutando `SELECT 1`.
- `POST /api/auth/login`: valida las credenciales de prueba configuradas en el entorno.
- `GET /api/auth/me`: comprueba la sesión actual.
- `POST /api/auth/logout`: revoca la sesión actual.
- `GET /api/accounts/demo`: devuelve el saldo y la moneda de la cuenta de demostración (requiere sesión).
- `GET /api/accounts/demo/movements`: lista movimientos (requiere sesión); acepta `search`, `type` (`subscription`, `received`, `sent`) y `limit` (1–100).
- `GET /api/movements/:id`: devuelve el detalle de un movimiento (requiere sesión).

Las migraciones y el seed usan `DATABASE_URL_UNPOOLED` cuando está disponible; las consultas de la API usan `DATABASE_URL`. Las sesiones se guardan en `auth_sessions`; la cookie es `HttpOnly`, `SameSite=Lax`, `Secure` en producción y conserva solo el hash del token en PostgreSQL. La sesión dura 12 horas por defecto o 30 días al activar Recordarme.

El frontend hace las llamadas mediante rutas relativas `/api`. Next.js las reenvía a `API_PROXY_URL` para que el navegador y la cookie permanezcan bajo el mismo origen. Para desarrollo local el ejemplo usa `http://localhost:4000`.

## Neon y Vercel

Configurar el proyecto web de Vercel con **Root Directory `frontend`** y `API_PROXY_URL` con la URL pública del backend. El backend se despliega como un proyecto Vercel separado con Root Directory `backend`; configurar `DATABASE_URL` con la URL pooled (`-pooler`) de Neon y `CHALLENGE_LOGIN_EMAIL` / `CHALLENGE_LOGIN_PASSWORD` en sus variables privadas. Las migraciones usan la URL directa `DATABASE_URL_UNPOOLED` y se ejecutan antes de exponer la nueva versión. La API requiere TLS para conexiones a Neon. Guardar valores en el administrador de variables de entorno; nunca subir archivos `.env`.

El deployment asociado al commit `45364ad` falló porque Vercel buscó el directorio de salida `public` y no lo encontró. La configuración actual está tratando el monorepo como un sitio estático en la raíz, aunque Next genera su salida en `frontend/.next`. Corregir el proyecto web con Root Directory `frontend` y framework preset **Next.js**; mantener el backend como proyecto Express separado en `backend`. Esta solución está documentada y todavía no se aplicó en el panel ni generó un deployment.

## Auditoría de dependencias

La auditoría del 19 de octubre de 2026 reportó cuatro vulnerabilidades transitivas: tres asociadas a `postcss@8.4.31` fijado por Next.js y una a `uuid@8.3.2` incluido por Sequelize. `npm audit` y `npm audit --omit=dev` informaron una alerta alta y tres moderadas. Se probó un override de PostCSS `8.5.31`, pero npm mantuvo la versión anidada fijada por Next y la auditoría no cambió; se retiró el override. No se editó el lockfile manualmente ni se forzó el salto mayor de `uuid`; volver a evaluar antes del despliegue.

Vercel detecta el entrypoint Express en `backend/src/server.ts`; el backend y el frontend se configuran como proyectos separados dentro del monorepo. Las tablas se administran con migraciones explícitas; la aplicación no ejecuta sincronizaciones automáticas.

## Estructura

```text
frontend/  Next.js, App Router, TypeScript y Tailwind CSS
backend/   Express, TypeScript, Sequelize y PostgreSQL
```
