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

2. Copiar `backend/.env.example` a `backend/.env`, completar la URL de conexión de Neon y configurar las variables `CHALLENGE_LOGIN_EMAIL` y `CHALLENGE_LOGIN_PASSWORD` con las credenciales de prueba. Copiar `frontend/.env.example` a `frontend/.env.local`.
3. Iniciar frontend y API:

   ```bash
   npm run dev
   ```

   Frontend: `http://localhost:3000`. API: `http://localhost:4000`.

## Scripts

- `npm run dev`: inicia frontend y backend en paralelo.
- `npm run build`: compila backend y frontend.
- `npm run typecheck`: verifica los tipos TypeScript de ambos workspaces.

## API

- `GET /api/health`: estado del servidor.
- `GET /api/health/db`: verifica PostgreSQL ejecutando `SELECT 1`.
- `POST /api/auth/login`: valida las credenciales de prueba configuradas en el entorno.

El frontend usa `NEXT_PUBLIC_API_URL` para elegir la API. Para desarrollo local, el valor predeterminado es `http://localhost:4000`.

## Neon y despliegue

Configurar `DATABASE_URL` con la URL pooled (`-pooler`) de Neon en entornos serverless como Vercel. La API requiere TLS para conexiones a Neon y usa un pool pequeño, con mínimo cero conexiones. Configurar `CORS_ORIGIN` con el origen desplegado del frontend y `NEXT_PUBLIC_API_URL` con la URL pública de la API. Guardar estos valores en el administrador de variables de entorno del despliegue; nunca subir archivos `.env`.

La aplicación no crea ni altera tablas automáticamente. No ejecutar sincronizaciones destructivas contra una base compartida.

## Estructura

```text
frontend/  Next.js, App Router, TypeScript y Tailwind CSS
backend/   Express, TypeScript, Sequelize y PostgreSQL
```
