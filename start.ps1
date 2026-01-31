# Script PowerShell pour démarrer Aetheria OS

Write-Host "🚀 Starting Aetheria Internal OS..." -ForegroundColor Cyan
Write-Host ""

# Vérifier que Docker est lancé
Write-Host "Checking Docker..." -ForegroundColor Yellow
docker --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker is not running. Please start Docker Desktop first." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Docker is running" -ForegroundColor Green
Write-Host ""

# Build et démarrage des containers
Write-Host "Building and starting containers..." -ForegroundColor Yellow
docker-compose up --build -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to start containers" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Containers started successfully" -ForegroundColor Green
Write-Host ""

# Attendre que les services soient prêts
Write-Host "Waiting for services to be ready (10 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Initialiser la base de données
Write-Host "Initializing database..." -ForegroundColor Yellow
docker exec aetheria_backend python init_db.py

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Database initialization had issues (may already be initialized)" -ForegroundColor Yellow
} else {
    Write-Host "✅ Database initialized" -ForegroundColor Green
}

Write-Host ""
Write-Host "=" -NoNewline -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan
Write-Host "  ✨ Aetheria Internal OS is ready!" -ForegroundColor Green
Write-Host "=" -NoNewline -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan
Write-Host ""
Write-Host "🔗 Services:" -ForegroundColor Cyan
Write-Host "   - Frontend:     http://localhost:3000" -ForegroundColor White
Write-Host "   - API Backend:  http://localhost:8000" -ForegroundColor White
Write-Host "   - API Docs:     http://localhost:8000/docs" -ForegroundColor White
Write-Host ""
Write-Host "🔐 Admin Login:" -ForegroundColor Cyan
Write-Host "   - Email:        admin@aetheria.local" -ForegroundColor White
Write-Host "   - Password:     admin123" -ForegroundColor White
Write-Host ""
Write-Host "📊 View logs:      docker-compose logs -f" -ForegroundColor Yellow
Write-Host "🛑 Stop services:  docker-compose down" -ForegroundColor Yellow
Write-Host "🧪 Run tests:      .\test_fullstack.ps1" -ForegroundColor Yellow
Write-Host ""
