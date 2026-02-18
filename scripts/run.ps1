$ErrorActionPreference = "Stop"

Set-Location (Split-Path $PSScriptRoot)  # to repo root

if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host "[i] Created .env from .env.example (edit if needed)"
}

Write-Host "[i] Starting containers..."
docker compose up -d --build

Write-Host ""
Write-Host "[ok] Started."
Write-Host "App:        http://localhost:5173"
Write-Host "Backend:    http://localhost:8000/health"
Write-Host "Prometheus: http://localhost:9090"
