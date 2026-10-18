param([switch]$VerifyRestore)
$ErrorActionPreference='Stop'
$projectRoot=Split-Path $PSScriptRoot -Parent
$pgBin='C:\Program Files\PostgreSQL\17\bin'
$config=Get-Content -LiteralPath (Join-Path $projectRoot '.local/database.json') -Raw | ConvertFrom-Json
if($config.DB_URL -ne 'jdbc:postgresql://127.0.0.1:5433/dieta_facil'){throw 'Este script usa somente o banco local exclusivo do Dieta Fácil.'}
$backupDir=Join-Path $projectRoot '.local/backups'
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
$backupPath=Join-Path $backupDir ('dieta-facil-'+(Get-Date -Format 'yyyyMMdd-HHmmss')+'-'+[guid]::NewGuid().ToString('N').Substring(0,6)+'.dump')
$previousPassword=[Environment]::GetEnvironmentVariable('PGPASSWORD','Process')
$temporaryDatabase='df_restore_'+[guid]::NewGuid().ToString('N').Substring(0,12)
$created=$false
try{
 [Environment]::SetEnvironmentVariable('PGPASSWORD',$config.DB_PASSWORD,'Process')
 & "$pgBin\pg_dump.exe" -h 127.0.0.1 -p 5433 -U dieta_facil -d dieta_facil --format=custom --no-owner --no-privileges --file=$backupPath
 if($LASTEXITCODE -ne 0){throw 'Falha ao gerar backup.'}
 if($VerifyRestore){
  & "$pgBin\createdb.exe" -h 127.0.0.1 -p 5433 -U dieta_facil $temporaryDatabase
  if($LASTEXITCODE -ne 0){throw 'Falha ao criar banco temporário de validação.'}
  $created=$true
  & "$pgBin\pg_restore.exe" -h 127.0.0.1 -p 5433 -U dieta_facil -d $temporaryDatabase --no-owner --no-privileges --exit-on-error $backupPath
  if($LASTEXITCODE -ne 0){throw 'Falha ao restaurar cópia de validação.'}
  $validation=& "$pgBin\psql.exe" -h 127.0.0.1 -p 5433 -U dieta_facil -d $temporaryDatabase -tAc "SELECT count(*) FROM flyway_schema_history WHERE success"
  if($LASTEXITCODE -ne 0 -or [int]$validation -lt 9){throw 'Restauração sem todas as migrações esperadas.'}
  Write-Output 'Restauração verificada em banco temporário; banco original preservado.'
 }
 Write-Output ('Backup local: '+$backupPath)
}finally{
 if($created){
  if($temporaryDatabase -notmatch '^df_restore_[0-9a-f]{12}$'){throw 'Nome de banco temporário inválido.'}
  & "$pgBin\dropdb.exe" -h 127.0.0.1 -p 5433 -U dieta_facil $temporaryDatabase
 }
 [Environment]::SetEnvironmentVariable('PGPASSWORD',$previousPassword,'Process')
}

