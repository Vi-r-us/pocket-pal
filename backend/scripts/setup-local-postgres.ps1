#Requires -RunAsAdministrator
<#
  Resets the local PostgreSQL 18 `postgres` password to match backend/.env
  and creates the pocket_pal_db database.

  Usage (PowerShell as Administrator):
    cd path\to\pocket-pal\backend
    .\scripts\setup-local-postgres.ps1
#>

$ErrorActionPreference = "Stop"

$pgData = "C:\Program Files\PostgreSQL\18\data"
$pgBin = "C:\Program Files\PostgreSQL\18\bin"
$hbaPath = Join-Path $pgData "pg_hba.conf"
$serviceName = "postgresql-x64-18"
$envFile = Join-Path $PSScriptRoot "..\.env"

if (-not (Test-Path $envFile)) {
  throw "Missing $envFile"
}

function Read-DotenvValue {
  param([string]$Key)
  $line = Get-Content $envFile | Where-Object { $_ -match "^\s*$Key=" } | Select-Object -First 1
  if (-not $line) { throw "Missing $Key in .env" }
  return ($line -split "=", 2)[1].Trim()
}

$dbUser = Read-DotenvValue "DB_USER"
$dbPassword = Read-DotenvValue "DB_PASSWORD"
$dbName = Read-DotenvValue "DATABASE"

if (-not (Test-Path $hbaPath)) {
  throw "PostgreSQL 18 not found at $pgData. Install PG 18 or edit paths in this script."
}

$backupPath = "$hbaPath.pocketpal.bak"
if (-not (Test-Path $backupPath)) {
  Copy-Item $hbaPath $backupPath
  Write-Host "Backed up pg_hba.conf -> $backupPath"
}

$content = Get-Content $hbaPath -Raw
$trustContent = $content `
  -replace 'host\s+all\s+all\s+127\.0\.0\.1/32\s+\S+', 'host    all             all             127.0.0.1/32            trust' `
  -replace 'host\s+all\s+all\s+::1/128\s+\S+', 'host    all             all             ::1/128                 trust'

Set-Content -Path $hbaPath -Value $trustContent -NoNewline
Write-Host "Temporarily enabled trust auth for localhost..."

Restart-Service $serviceName -Force
Start-Sleep -Seconds 4

$psql = Join-Path $pgBin "psql.exe"
$escapedPassword = $dbPassword.Replace("'", "''")

& $psql -U $dbUser -h 127.0.0.1 -d postgres -v ON_ERROR_STOP=1 -c "ALTER USER $dbUser PASSWORD '$escapedPassword';"

$dbExists = (& $psql -U $dbUser -h 127.0.0.1 -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$dbName';").Trim()
if ($dbExists -ne "1") {
  & $psql -U $dbUser -h 127.0.0.1 -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE $dbName;"
  Write-Host "Created database: $dbName"
} else {
  Write-Host "Database already exists: $dbName"
}

Copy-Item $backupPath $hbaPath -Force
Write-Host "Restored pg_hba.conf"

Restart-Service $serviceName -Force
Start-Sleep -Seconds 3

$env:PGPASSWORD = $dbPassword
& $psql -U $dbUser -h 127.0.0.1 -d $dbName -v ON_ERROR_STOP=1 -c "SELECT current_database();"
Remove-Item Env:PGPASSWORD

Write-Host ""
Write-Host "Done. Password for '$dbUser' now matches backend/.env."
Write-Host "Run: npm run dev"
