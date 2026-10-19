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
- `GET /api/accounts/demo`: devuelve el saldo y la moneda de la cuenta de demostración.
- `GET /api/accounts/demo/movements`: lista movimientos; acepta `search`, `type` (`subscription`, `received`, `sent`) y `limit` (1–100).
- `GET /api/movements/:id`: devuelve el detalle de un movimiento.

Las migraciones y el seed usan `DATABASE_URL_UNPOOLED` cuando está disponible; las consultas de la API usan `DATABASE_URL`.

El frontend usa `NEXT_PUBLIC_API_URL` para elegir la API. Para desarrollo local, el valor predeterminado es `http://localhost:4000`.

## Neon y despliegue

Configurar `DATABASE_URL` con la URL pooled (`-pooler`) de Neon en entornos serverless como Vercel. La API requiere TLS para conexiones a Neon y usa un pool pequeño, con mínimo cero conexiones. Configurar `CORS_ORIGIN` con el origen desplegado del frontend y `NEXT_PUBLIC_API_URL` con la URL pública de la API. Guardar estos valores en el administrador de variables de entorno del despliegue; nunca subir archivos `.env`.

Las tablas se administran con migraciones explícitas; la aplicación no ejecuta sincronizaciones automáticas. **Pendiente antes de la entrega:** `/home`, `/movimientos` y los endpoints de la cuenta demo todavía no exigen una sesión autenticada. El login actual solo valida credenciales de demostración y no emite una sesión; implementar autenticación y autorización en el backend antes de usar datos reales.

## Estructura

```text
frontend/  Next.js, App Router, TypeScript y Tailwind CSS
backend/   Express, TypeScript, Sequelize y PostgreSQL
```
