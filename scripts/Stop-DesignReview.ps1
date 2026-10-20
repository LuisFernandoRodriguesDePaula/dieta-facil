param([string]$RunId, [string]$WaitUntil)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$reviewRoot = Join-Path $projectRoot '.local/design-review'
$stateFile = Join-Path $reviewRoot 'session.json'
if ($WaitUntil) {
    $deadline = [DateTimeOffset]::Parse($WaitUntil)
    while ([DateTimeOffset]::UtcNow -lt $deadline) {
        if (-not (Test-Path -LiteralPath $stateFile)) { return }
        try { $current = Get-Content -LiteralPath $stateFile -Raw | ConvertFrom-Json } catch { Start-Sleep -Seconds 1; continue }
        if ($current.runId -ne $RunId -or $current.status -ne 'running') { return }
        Start-Sleep -Seconds 30
    }
}
if (-not (Test-Path -LiteralPath $stateFile)) { Write-Output 'Nenhuma revisão temporária registrada.'; return }
$state = Get-Content -LiteralPath $stateFile -Raw | ConvertFrom-Json
if ($RunId -and $state.runId -ne $RunId) { return }
foreach ($entry in @($state.tunnel, $state.api, $state.lease)) {
    if (-not $entry -or $entry.id -eq $PID) { continue }
    $process = Get-Process -Id $entry.id -ErrorAction SilentlyContinue
    if (-not $process) { continue }
    $command = (Get-CimInstance Win32_Process -Filter "ProcessId=$($entry.id)").CommandLine
    if ($process.StartTime.ToUniversalTime().Ticks -ne ([DateTimeOffset]$entry.startedAt).UtcDateTime.Ticks -or -not $command.Contains($entry.marker)) {
        throw 'Identidade do processo mudou. Nenhum processo diferente será encerrado.'
    }
    Stop-Process -Id $entry.id
}
$state.status = 'stopped'
[IO.File]::WriteAllText($stateFile, ($state | ConvertTo-Json -Depth 5), [Text.UTF8Encoding]::new($false))
Write-Output 'Link temporário encerrado. Banco de revisão e dados pessoais preservados.'
