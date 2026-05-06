# Load environment variables from .env and start Spring Boot

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$envFile = Join-Path $scriptDir '.env'
$mvnw = Join-Path $scriptDir 'mvnw.cmd'

if (-not (Test-Path $mvnw)) {
    Write-Host "ERROR: mvnw.cmd not found in $scriptDir" -ForegroundColor Red
    exit 1
}
$projectRoot = Split-Path $scriptDir -Parent
$dockerDir = Join-Path $projectRoot 'docker'
$composeFile = Join-Path $dockerDir 'docker-compose.yml'

if (Test-Path $envFile) {
    Write-Host 'Loading environment variables from .env...' -ForegroundColor Green
    foreach ($rawLine in Get-Content $envFile) {
        $line = $rawLine.Trim()
        if ($line.Length -eq 0 -or $line.StartsWith('#')) {
            continue
        }

        $equalsIndex = $line.IndexOf('=')
        if ($equalsIndex -lt 1) {
            continue
        }

        $key = $line.Substring(0, $equalsIndex).Trim()
        $value = $line.Substring($equalsIndex + 1).Trim()
        if ($value.Length -ge 2 -and $value.StartsWith('"') -and $value.EndsWith('"')) {
            $value = $value.Substring(1, $value.Length - 2)
        }

        [Environment]::SetEnvironmentVariable($key, $value, 'Process')
        Write-Host ('Loaded ' + $key)
    }
} else {
    Write-Host 'WARN: .env file not found, using current environment variables.' -ForegroundColor Yellow
}

Write-Host ''
Write-Host 'Verifying backend variables:' -ForegroundColor Cyan
Write-Host ('DB_HOST: ' + $env:DB_HOST)
Write-Host ('DB_PORT: ' + $env:DB_PORT)
Write-Host ('DB_NAME: ' + $env:DB_NAME)
Write-Host ('DB_USER: ' + $env:DB_USER)
Write-Host ('SPRING_LIQUIBASE_ENABLED: ' + $env:SPRING_LIQUIBASE_ENABLED)
Write-Host ('MQTT_HOST: ' + $env:MQTT_HOST)
Write-Host ('MQTT_PORT: ' + $env:MQTT_PORT)

if (Get-Command docker -ErrorAction SilentlyContinue) {
    if (Test-Path $composeFile) {
        Push-Location $dockerDir
        try {
            docker compose up -d timescaledb | Out-Host
            Write-Host ''
            Write-Host 'Checking PostgreSQL credentials against the running TimescaleDB container...' -ForegroundColor Cyan

            $probeCommand = 'PGPASSWORD=' + "'" + $env:DB_PASSWORD + "'" + ' psql -h 127.0.0.1 -U ' + "'" + $env:DB_USER + "'" + ' -d ' + "'" + $env:DB_NAME + "'" + ' -tAc ' + "'SELECT 1'"
            & docker compose exec -T timescaledb sh -lc $probeCommand | Out-Host

            if ($LASTEXITCODE -ne 0) {
                Write-Host ''
                Write-Host 'ERROR: TimescaleDB is reachable, but the credentials from .env are rejected by the existing database volume.' -ForegroundColor Red
                Write-Host 'The local volume likely contains an older password for user smarthome.' -ForegroundColor Yellow
                Write-Host 'Fix: run `cd docker; docker compose down -v; docker compose up -d` and then re-run this script.' -ForegroundColor Yellow
                exit 1
            }
        } finally {
            Pop-Location
        }
    }
}

[Environment]::SetEnvironmentVariable('SPRING_DATASOURCE_URL', 'jdbc:postgresql://' + $env:DB_HOST + ':' + $env:DB_PORT + '/' + $env:DB_NAME, 'Process')
[Environment]::SetEnvironmentVariable('SPRING_DATASOURCE_USERNAME', $env:DB_USER, 'Process')
[Environment]::SetEnvironmentVariable('SPRING_DATASOURCE_PASSWORD', $env:DB_PASSWORD, 'Process')
[Environment]::SetEnvironmentVariable('SPRING_LIQUIBASE_ENABLED', $env:SPRING_LIQUIBASE_ENABLED, 'Process')

Set-Location $scriptDir
Write-Host ''
Write-Host '========================================' -ForegroundColor Yellow
Write-Host 'Starting Spring Boot...' -ForegroundColor Yellow
Write-Host '========================================' -ForegroundColor Yellow
Write-Host ''

$jvmArguments = '-Dspring.datasource.url=jdbc:postgresql://' + $env:DB_HOST + ':' + $env:DB_PORT + '/' + $env:DB_NAME + ' -Dspring.datasource.username=' + $env:DB_USER + ' -Dspring.datasource.password=' + $env:DB_PASSWORD + ' -Dspring.liquibase.enabled=' + $env:SPRING_LIQUIBASE_ENABLED
& $mvnw ('-Dspring-boot.run.jvmArguments=' + $jvmArguments) 'spring-boot:run'
