param([ValidatePattern('^\d{4}\.\d+\.\d+$')][string]$Version = '2026.10.1')
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$reviewRoot = Join-Path $projectRoot '.local/design-review'
New-Item -ItemType Directory -Path $reviewRoot -Force | Out-Null
$release = Invoke-RestMethod "https://api.github.com/repos/cloudflare/cloudflared/releases/tags/$Version"
$asset = $release.assets | Where-Object name -eq 'cloudflared-windows-amd64.exe'
if ($asset.digest -notmatch '^sha256:[0-9a-f]{64}$' -or $asset.browser_download_url -notlike 'https://github.com/cloudflare/cloudflared/releases/download/*/cloudflared-windows-amd64.exe') {
    throw 'Distribuição oficial sem origem ou checksum verificável.'
}
$target = Join-Path $reviewRoot 'cloudflared.exe'
Invoke-WebRequest $asset.browser_download_url -OutFile $target
$checksum = (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLower()
if ("sha256:$checksum" -ne $asset.digest) { throw 'Checksum divergente; o conector não será executado.' }
@{version=$release.tag_name;sha256=$checksum;source=$asset.browser_download_url} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $reviewRoot 'cloudflared-version.json') -Encoding UTF8
Write-Output "Conector oficial $($release.tag_name) instalado apenas na pasta privada do projeto; SHA-256 conferido."
