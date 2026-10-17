$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
if ($npm) { $npmPath = $npm.Source } else { $npmPath = 'C:\Program Files\nodejs\npm.cmd' }
if (-not (Test-Path $npmPath)) { throw 'Instale Node.js LTS e abra um novo terminal.' }
Push-Location (Join-Path $projectRoot 'frontend')
try { & $npmPath run dev } finally { Pop-Location }
