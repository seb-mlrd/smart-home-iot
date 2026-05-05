# Load environment variables from .env and start Spring Boot

if (-not (Test-Path ".\.env")) {
    Write-Host "ERROR: .env file not found!" -ForegroundColor Red
    exit 1
}

Write-Host "Loading environment variables from .env..." -ForegroundColor Green
Get-Content .\.env | ForEach-Object {
    if ($_ -and -not ($_.Trim().StartsWith("#"))) {
        if ($_ -match "^([^=]+)=(.*)$") {
            $key = $matches[1]
            $value = $matches[2]
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
            Write-Host "✓ $key loaded"
        }
    }
}

Write-Host "`nVerifying MQTT variables:" -ForegroundColor Cyan
Write-Host "MQTT_HOST: $env:MQTT_HOST"
Write-Host "MQTT_PORT: $env:MQTT_PORT"
Write-Host "MQTT_USER: $env:MQTT_USER"
Write-Host "SPRING_LIQUIBASE_ENABLED: $env:SPRING_LIQUIBASE_ENABLED"

Write-Host "`n========================================" -ForegroundColor Yellow
Write-Host "Starting Spring Boot..." -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Yellow

.\mvnw.cmd spring-boot:run
