# Continuar el proyecto en otra PC

## Enlaces

- [Repositorio GitHub](https://github.com/EnzoAA004/challengeClubLanusWebApp)
- [Pull request de la etapa 4](https://github.com/EnzoAA004/challengeClubLanusWebApp/pull/2)
- [Proyecto Neon](https://console.neon.tech/app/projects/bold-credit-69103769/branches/br-long-wave-ar9d71bn)
- [Rama production de Neon](https://console.neon.tech/app/projects/bold-credit-69103769/branches/br-long-wave-ar9d71bn)
- [Proyecto frontend en Vercel](https://vercel.com/enzoaa004s-projects/challenge_clublanus_webapp)
- [Proyecto API en Vercel](https://vercel.com/enzoaa004s-projects/challenge-club-lanus-api)
- [Preview frontend](https://challengeclublanuswebapp-edv88h3pr-enzoaa004s-projects.vercel.app)
- [Preview API](https://challenge-club-lanus-3lbidx9m4-enzoaa004s-projects.vercel.app)
- [Variables de entorno del frontend](https://vercel.com/enzoaa004s-projects/challenge_clublanus_webapp/settings/environment-variables)
- [Variables de entorno de la API](https://vercel.com/enzoaa004s-projects/challenge-club-lanus-api/settings/environment-variables)

Los dos enlaces de Preview requieren una sesión autorizada de Vercel porque Deployment Protection está habilitada.

## Preparación

Instalá Git, Node.js 22 o posterior y npm 10 o posterior. En PowerShell, cloná el repositorio y entrá en su carpeta:

```powershell
git clone https://github.com/EnzoAA004/challengeClubLanusWebApp.git
Set-Location .\challengeClubLanusWebApp
```

Guardá este archivo junto al script `continuar-en-otra-pc.ps1` o descargá ambos desde la rama `feat/auth-ui-final`.

## Actualizar el repositorio y recuperar Neon

Autenticá la CLI de Neon en esa PC si todavía no lo hiciste:

```powershell
npx neon@latest login
```

Luego ejecutá el script desde la raíz del repositorio:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\continuar-en-otra-pc.ps1
```

El script actualiza `feat/auth-ui-final` con `git pull --ff-only`, instala las dependencias con `npm ci`, vincula la CLI al **proyecto Neon existente** y ejecuta `neon env pull --branch production` desde `backend/`. Las variables se escriben en `backend/.env`, excluido de Git. No crea un proyecto ni modifica el esquema o los datos de la base.

## Completar configuración local

`neon env pull` recupera las variables de conexión de la base. En `backend/.env`, completá también `CHALLENGE_LOGIN_EMAIL` y `CHALLENGE_LOGIN_PASSWORD` con las credenciales demo ya configuradas en los ajustes privados de la API en Vercel. No compartas ni subas ese archivo.

Copiá `frontend/.env.example` a `frontend/.env.local`. Para desarrollo local dejá `API_PROXY_URL=http://localhost:4000`. No hace falta usar el secreto de bypass de Preview en local.

Después iniciá ambos servicios:

```powershell
npm run dev
```

Frontend: `http://localhost:3000`. API: `http://localhost:4000`. Estado de la API y PostgreSQL: `http://localhost:4000/api/health` y `http://localhost:4000/api/health/db`.

## Secretos de Vercel

Los valores marcados como sensibles en Vercel no pueden recuperarse mediante `vercel env pull`; deben consultarse o cargarse desde la configuración privada de cada proyecto. La API usa `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `CHALLENGE_LOGIN_EMAIL` y `CHALLENGE_LOGIN_PASSWORD`. El frontend usa `API_PROXY_URL` y el secreto Preview-only `API_PREVIEW_BYPASS_SECRET`. No pegues los valores en GitHub, este documento ni el chat.

La API Preview actual responde `GET /api/health` y `GET /api/health/db` con estado correcto. El deploy frontend y ambos endpoints se validaron durante esta etapa.
