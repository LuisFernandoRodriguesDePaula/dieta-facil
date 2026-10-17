$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
if (-not $env:JAVA_HOME) {
    $jdk = Get-ChildItem 'C:\Program Files\Eclipse Adoptium' -Directory -Filter 'jdk-21*' -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($jdk) { $env:JAVA_HOME = $jdk.FullName }
}
if (-not $env:JAVA_HOME) { throw 'Instale Java 21 e configure JAVA_HOME.' }
$configFile = Join-Path $projectRoot '.local/database.json'
if (Test-Path $configFile) {
    $config = Get-Content $configFile -Raw | ConvertFrom-Json
    $env:DB_URL = $config.DB_URL
    $env:DB_USER = $config.DB_USER
    $env:DB_PASSWORD = $config.DB_PASSWORD
}
if (-not $env:DB_PASSWORD) { throw 'Execute Start-Database.ps1 ou defina DB_PASSWORD, DB_URL e DB_USER.' }
Push-Location (Join-Path $projectRoot 'backend')
try { & .\mvnw.cmd -B -ntp spring-boot:run } finally { Pop-Location }
