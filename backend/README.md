Smart Home Backend — Quick start

This README covers local development setup and quick commands.

Prerequisites
- Java 21
- Docker & Docker Compose
- Maven (optional, `./mvnw` is provided)

Configuration
- Copy `backend/.env.example` to `backend/.env` and fill secrets (this file is local and should not be committed).
- The app reads configuration from environment variables; use the provided `run-backend.ps1` or `load-env.ps1` to load them into your session.

Start dev stack (DB + HiveMQ broker)

```powershell
cd <repo-root>/docker
docker-compose up -d
# wait a few seconds for TimescaleDB to become healthy
docker exec smarthome-timescaledb pg_isready -U smarthome -d smarthome
```

Run backend

Option A — PowerShell helper (recommended on Windows):
```powershell
cd <repo-root>/backend
.\run-backend.ps1
```

Option B — manual (load .env then run):
```powershell
Get-Content .\.env | ForEach-Object {
  if ($_ -and -not ($_.Trim().StartsWith('#'))) {
    if ($_ -match "^([^=]+)=(.*)$") {
      [Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
    }
  }
}
./mvnw.cmd spring-boot:run
```

Testing MQTT
- Use HiveMQ Cloud Web Client or another MQTT client.
- Subscribe to topics used by your devices (examples in `application.yml`).
- Publish a test message and check backend logs for `MQTT message received` entries.

Notes
- `backend/.env` must never be committed. Use `.env.example` for defaults.
- Liquibase migrations are disabled by default for quick dev startup; enable when DB is ready.

If you want, I can also tidy up `application.yml` comments and add a `Makefile`/`ps1` shortcuts — want that?