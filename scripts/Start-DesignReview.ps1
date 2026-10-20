param([switch]$LocalOnly, [ValidateRange(1,24)][int]$Hours = 8)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$reviewRoot = Join-Path $projectRoot '.local/design-review'
$stateFile = Join-Path $reviewRoot 'session.json'
$npm = (Get-Command npm.cmd -ErrorAction SilentlyContinue).Source
if (-not $npm) { $npm = 'C:\Program Files\nodejs\npm.cmd' }
$jdk = Get-ChildItem 'C:\Program Files\Eclipse Adoptium' -Directory -Filter 'jdk-21*' | Select-Object -First 1
if (-not $jdk) { throw 'Java 21 não encontrado.' }
$java = Join-Path $jdk.FullName 'bin/java.exe'
if (Test-Path -LiteralPath $stateFile) {
    $old = Get-Content -LiteralPath $stateFile -Raw | ConvertFrom-Json
    if ($old.status -eq 'running') { throw 'Já existe uma revisão registrada. Encerre-a com Stop-DesignReview.ps1 antes de atualizar.' }
}
if (Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction SilentlyContinue) { throw 'Porta 8081 ocupada; nenhum serviço existente será interrompido.' }
New-Item -ItemType Directory -Path $reviewRoot -Force | Out-Null
if (-not $LocalOnly) {
    $connector = Join-Path $reviewRoot 'cloudflared.exe'
    $manifest = Get-Content -LiteralPath (Join-Path $reviewRoot 'cloudflared-version.json') -Raw | ConvertFrom-Json
    if ($manifest.source -notlike 'https://github.com/cloudflare/cloudflared/releases/download/*/cloudflared-windows-amd64.exe' -or
        (Get-FileHash -LiteralPath $connector -Algorithm SHA256).Hash.ToLower() -ne $manifest.sha256) { throw 'Conector sem checksum oficial correspondente.' }
}
& (Join-Path $PSScriptRoot 'Start-Database.ps1')
$db = Get-Content -LiteralPath (Join-Path $projectRoot '.local/database.json') -Raw | ConvertFrom-Json
if ($db.DB_URL -ne 'jdbc:postgresql://127.0.0.1:5433/dieta_facil') { throw 'Configuração local inesperada.' }
$previousPassword = [Environment]::GetEnvironmentVariable('PGPASSWORD','Process')
try {
    [Environment]::SetEnvironmentVariable('PGPASSWORD',$db.DB_PASSWORD,'Process')
    $pg = 'C:\Program Files\PostgreSQL\17\bin'
    $exists = & "$pg\psql.exe" -h 127.0.0.1 -p 5433 -U dieta_facil -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='dieta_facil_review'"
    if ($LASTEXITCODE -ne 0) { throw 'Não foi possível consultar o PostgreSQL.' }
    if ($exists -ne '1') {
        & "$pg\createdb.exe" -h 127.0.0.1 -p 5433 -U dieta_facil dieta_facil_review
        if ($LASTEXITCODE -ne 0) { throw 'Não foi possível criar o banco exclusivo da revisão.' }
    }
} finally { [Environment]::SetEnvironmentVariable('PGPASSWORD',$previousPassword,'Process') }
Push-Location $projectRoot
try {
    & $npm --prefix frontend run build
    if ($LASTEXITCODE -ne 0) { throw 'Falha ao compilar interface.' }
    Push-Location backend
    try { & .\mvnw.cmd -B -ntp -DskipTests package *> (Join-Path $reviewRoot 'build.log'); if ($LASTEXITCODE -ne 0) { throw 'Falha ao empacotar API; consulte build.log privado.' } } finally { Pop-Location }
    $web = Join-Path $reviewRoot 'web'
    New-Item -ItemType Directory -Path $web -Force | Out-Null
    Copy-Item -Path (Join-Path $projectRoot 'frontend/dist/*') -Destination $web -Recurse -Force
    $jar = Join-Path $reviewRoot 'dieta-facil-review.jar'
    Copy-Item -LiteralPath (Join-Path $projectRoot 'backend/target/backend-0.0.1-SNAPSHOT.jar') -Destination $jar -Force
    $properties = Join-Path $reviewRoot 'review.properties'
    $configLines = @(
        'spring.datasource.url=jdbc:postgresql://127.0.0.1:5433/dieta_facil_review',
        "spring.datasource.username=$($db.DB_USER)", "spring.datasource.password=$($db.DB_PASSWORD)",
        'server.address=127.0.0.1', 'server.port=8081', 'server.forward-headers-strategy=framework',
        'spring.web.resources.static-locations=file:./web/', 'app.mail.mode=file', 'app.mail.directory=./mail',
        'app.public-base-url=https://design-review.example.invalid', 'app.security.rate-limit-enabled=true',
        'app.require-verified-email=false'
    )
    function Start-ReviewApi([bool]$SecureCookie) {
        [IO.File]::WriteAllLines($properties, [string[]]($configLines + ('server.servlet.session.cookie.secure=' + $SecureCookie.ToString().ToLower())), [Text.UTF8Encoding]::new($false))
        $process = Start-Process -FilePath $java -ArgumentList '-jar dieta-facil-review.jar --spring.config.additional-location=file:review.properties --spring.profiles.active=design-review' -WorkingDirectory $reviewRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $reviewRoot 'api.log') -RedirectStandardError (Join-Path $reviewRoot 'api-error.log') -PassThru
        for ($i=0; $i -lt 60; $i++) {
            if ($process.HasExited) { throw 'API de revisão não iniciou; consulte api.log privado.' }
            try { if ((Invoke-RestMethod 'http://127.0.0.1:8081/actuator/health' -TimeoutSec 2).status -eq 'UP') { return $process } } catch { }
            Start-Sleep -Seconds 1
        }
        Stop-Process -Id $process.Id
        throw 'Tempo de inicialização da revisão excedido.'
    }
    $api = $null
    $tunnel = $null
    try {
        $api = Start-ReviewApi $false
        $previousReview = $env:DIETA_DESIGN_REVIEW
        try { $env:DIETA_DESIGN_REVIEW='1'; & $npm --prefix frontend run demo:care; if ($LASTEXITCODE -ne 0) { throw 'Falha ao preparar contas fictícias exclusivas.' } } finally { $env:DIETA_DESIGN_REVIEW=$previousReview }
        $url = 'http://127.0.0.1:8081'
        if (-not $LocalOnly) {
            Stop-Process -Id $api.Id
            $api.WaitForExit()
            $api = Start-ReviewApi $true
            $tunnel = Start-Process -FilePath $connector -ArgumentList 'tunnel --no-autoupdate --protocol http2 --url http://127.0.0.1:8081' -WindowStyle Hidden -RedirectStandardOutput (Join-Path $reviewRoot 'tunnel-out.log') -RedirectStandardError (Join-Path $reviewRoot 'tunnel.log') -PassThru
            $url = $null
            for ($i=0; $i -lt 60; $i++) {
                if ($tunnel.HasExited) { throw 'Túnel não iniciou; consulte tunnel.log privado.' }
                $log = Get-Content -LiteralPath (Join-Path $reviewRoot 'tunnel.log') -Raw -ErrorAction SilentlyContinue
                if ($log -match 'https://[a-z0-9-]+\.trycloudflare\.com') { $url = $Matches[0]; break }
                Start-Sleep -Seconds 1
            }
            if (-not $url) { throw 'Não foi possível obter um link temporário.' }
        }
        $runId = [guid]::NewGuid().ToString('N')
        $expires = [DateTimeOffset]::UtcNow.AddHours($Hours).ToString('o')
        $state = @{runId=$runId;status='running';url=$url;expiresAt=$expires;api=@{id=$api.Id;startedAt=$api.StartTime.ToUniversalTime().ToString('o');marker='dieta-facil-review.jar'};tunnel=$null;lease=$null}
        if ($tunnel) { $state.tunnel=@{id=$tunnel.Id;startedAt=$tunnel.StartTime.ToUniversalTime().ToString('o');marker=$connector} }
        [IO.File]::WriteAllText($stateFile, ($state | ConvertTo-Json -Depth 5), [Text.UTF8Encoding]::new($false))
        $stopFile = Join-Path $PSScriptRoot 'Stop-DesignReview.ps1'
        $lease = Start-Process -FilePath (Get-Process -Id $PID).Path -ArgumentList ('-NoProfile -File "' + $stopFile + '" -RunId ' + $runId + ' -WaitUntil "' + $expires + '"') -WindowStyle Hidden -RedirectStandardOutput (Join-Path $reviewRoot 'lease.log') -RedirectStandardError (Join-Path $reviewRoot 'lease-error.log') -PassThru
        $state.lease=@{id=$lease.Id;startedAt=$lease.StartTime.ToUniversalTime().ToString('o');marker=$runId}
        [IO.File]::WriteAllText($stateFile, ($state | ConvertTo-Json -Depth 5), [Text.UTF8Encoding]::new($false))
        Write-Output "Revisão disponível: $url/entrar"
        Write-Output "Encerra automaticamente em $Hours horas. Computador e internet devem permanecer ativos."
        Write-Output 'Contas fictícias e relatório privados em .local/design-review/. Não publique essa pasta.'
    } catch {
        if ($tunnel -and -not $tunnel.HasExited) { Stop-Process -Id $tunnel.Id }
        if ($api -and -not $api.HasExited) { Stop-Process -Id $api.Id }
        throw
    }
} finally { Pop-Location }


