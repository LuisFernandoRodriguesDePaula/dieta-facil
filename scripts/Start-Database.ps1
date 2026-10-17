$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$pgBin = 'C:\Program Files\PostgreSQL\17\bin'
if (-not (Test-Path "$pgBin\initdb.exe")) { throw 'Instale PostgreSQL 17 ou ajuste $pgBin neste script.' }
Push-Location $projectRoot
try {
    New-Item -ItemType Directory -Path '.local' -Force | Out-Null
    if (-not (Test-Path '.local/database.json')) {
        if (Test-Path '.local/pgdata') { throw 'Já existe um cluster sem configuração local. Não será sobrescrito.' }
        $passwordBytes = New-Object byte[] 24
        $generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
        $generator.GetBytes($passwordBytes)
        $generator.Dispose()
        $dbPassword = [Convert]::ToBase64String($passwordBytes)
        Set-Content '.local/db-password.txt' -Value $dbPassword -NoNewline -Encoding ASCII
        & "$pgBin\initdb.exe" -D '.local/pgdata' -U dieta_facil --pwfile='.local/db-password.txt' --auth=scram-sha-256 --encoding=UTF8 --locale=C
        if ($LASTEXITCODE -ne 0) { throw 'Falha ao inicializar o cluster.' }
        @{ DB_URL = 'jdbc:postgresql://127.0.0.1:5433/dieta_facil'; DB_USER = 'dieta_facil'; DB_PASSWORD = $dbPassword } | ConvertTo-Json | Set-Content '.local/database.json' -Encoding UTF8
    }
    & "$pgBin\pg_ctl.exe" -D '.local/pgdata' status *> $null
    if ($LASTEXITCODE -ne 0) {
        & "$pgBin\pg_ctl.exe" -D '.local/pgdata' -l '.local/postgres.log' -o '-p 5433 -h 127.0.0.1' start
        if ($LASTEXITCODE -ne 0) { throw 'Falha ao iniciar PostgreSQL. Consulte .local/postgres.log.' }
    }
    $config = Get-Content '.local/database.json' -Raw | ConvertFrom-Json
    $env:PGPASSWORD = $config.DB_PASSWORD
    $exists = & "$pgBin\psql.exe" -h 127.0.0.1 -p 5433 -U dieta_facil -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='dieta_facil'"
    if ($LASTEXITCODE -ne 0) { throw 'Não foi possível conectar ao banco.' }
    if ($exists -ne '1') {
        & "$pgBin\createdb.exe" -h 127.0.0.1 -p 5433 -U dieta_facil dieta_facil
        if ($LASTEXITCODE -ne 0) { throw 'Falha ao criar banco.' }
    }
    Write-Host 'PostgreSQL pronto em 127.0.0.1:5433. Credenciais em .local/database.json (ignorado no Git).'
} finally {
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    Pop-Location
}
