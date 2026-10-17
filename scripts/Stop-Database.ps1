$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
& 'C:\Program Files\PostgreSQL\17\bin\pg_ctl.exe' -D (Join-Path $projectRoot '.local/pgdata') stop -m fast
