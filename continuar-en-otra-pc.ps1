$ErrorActionPreference = 'Stop'

$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $RepoRoot

if (-not (Test-Path (Join-Path $RepoRoot '.git'))) {
  throw 'No se encontró el repositorio Git en la carpeta del script.'
}

$GitStatus = & git status --porcelain
if ($LASTEXITCODE -ne 0) { throw 'No se pudo consultar el estado de Git.' }
if ($GitStatus) {
  throw 'Hay cambios locales sin guardar. Guardalos o descartalos antes de continuar.'
}

$Branch = 'feat/auth-ui-final'
$CurrentBranch = (& git branch --show-current).Trim()
if ($LASTEXITCODE -ne 0) { throw 'No se pudo identificar la rama actual.' }

& git fetch origin $Branch
if ($LASTEXITCODE -ne 0) { throw 'No se pudo actualizar la información remota.' }

if ($CurrentBranch -ne $Branch) {
  $LocalBranch = & git branch --list $Branch
  if ($LocalBranch) {
    & git switch $Branch
  } else {
    & git switch --track "origin/$Branch"
  }
  if ($LASTEXITCODE -ne 0) { throw "No se pudo cambiar a la rama $Branch." }
}

& git pull --ff-only origin $Branch
if ($LASTEXITCODE -ne 0) { throw 'No se pudo actualizar la rama sin crear un merge.' }

& npm ci
if ($LASTEXITCODE -ne 0) { throw 'Falló la instalación de dependencias con npm ci.' }

$NeonCommand = Get-Command neon -ErrorAction SilentlyContinue
if ($NeonCommand) {
  & neon init -y --org-id org-wild-leaf-46920819 --project-id bold-credit-69103769 --branch production --services postgres
} else {
  & npx --yes neon@latest init -y --org-id org-wild-leaf-46920819 --project-id bold-credit-69103769 --branch production --services postgres
}
if ($LASTEXITCODE -ne 0) {
  throw 'Falló la configuración local de Neon. Si la CLI pidió autenticación, ejecutá neon login y volvé a correr este script.'
}

Push-Location (Join-Path $RepoRoot 'backend')
try {
  if ($NeonCommand) {
    & neon env pull --branch production
  } else {
    & npx --yes neon@latest env pull --branch production
  }
  if ($LASTEXITCODE -ne 0) { throw 'No se pudieron recuperar las variables de conexión de Neon.' }
} finally {
  Pop-Location
}

Write-Host ''
Write-Host 'Repositorio actualizado y dependencias instaladas.'
Write-Host 'Las variables de Neon se guardaron en backend/.env (archivo ignorado por Git).'
Write-Host 'Completá CHALLENGE_LOGIN_EMAIL y CHALLENGE_LOGIN_PASSWORD en backend/.env según las instrucciones del README.'
Write-Host 'Para iniciar frontend y API en modo local: npm run dev'
