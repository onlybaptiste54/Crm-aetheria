# Script de test Full-Stack Aetheria OS

Write-Host "🧪 Testing Aetheria Full-Stack..." -ForegroundColor Cyan
Write-Host ""

$API_URL = "http://localhost:8000"
$FRONTEND_URL = "http://localhost:3000"
$ADMIN_EMAIL = "admin@aetheria.local"
$ADMIN_PASSWORD = "admin123"

# Test 1: Backend Health
Write-Host "1. Testing Backend..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$API_URL/" -Method Get -TimeoutSec 5
    Write-Host "✅ Backend is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend is not responding" -ForegroundColor Red
    Write-Host "   Run: docker-compose up -d backend" -ForegroundColor Gray
    exit 1
}
Write-Host ""

# Test 2: Frontend Health
Write-Host "2. Testing Frontend..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$FRONTEND_URL" -Method Get -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Frontend is running" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Frontend is not responding" -ForegroundColor Red
    Write-Host "   Run: docker-compose up -d frontend" -ForegroundColor Gray
    exit 1
}
Write-Host ""

# Test 3: Database Connection (via backend)
Write-Host "3. Testing Database Connection..." -ForegroundColor Yellow
try {
    $loginBody = @{
        username = $ADMIN_EMAIL
        password = $ADMIN_PASSWORD
    }
    $response = Invoke-RestMethod -Uri "$API_URL/auth/token" -Method Post -Body $loginBody -ContentType "application/x-www-form-urlencoded"
    $token = $response.access_token
    Write-Host "✅ Database connection OK (Login successful)" -ForegroundColor Green
} catch {
    Write-Host "❌ Database connection failed or Admin user not created" -ForegroundColor Red
    Write-Host "   Run: docker exec aetheria_backend python init_db.py" -ForegroundColor Gray
    exit 1
}
Write-Host ""

# Test 4: API CRUD Operations
Write-Host "4. Testing API CRUD..." -ForegroundColor Yellow
try {
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    # Create Client
    $clientData = @{
        company_name = "Test Company"
        contact_person = "Test User"
        status = "Prospect"
        priority = "High"
    } | ConvertTo-Json
    
    $client = Invoke-RestMethod -Uri "$API_URL/clients" -Method Post -Headers $headers -Body $clientData
    Write-Host "   ✓ Create Client: OK" -ForegroundColor Green
    
    # Read Clients
    $clients = Invoke-RestMethod -Uri "$API_URL/clients" -Method Get -Headers $headers
    Write-Host "   ✓ Read Clients: OK ($($clients.Count) client(s))" -ForegroundColor Green
    
    # Update Client
    $updateData = @{
        priority = "Low"
    } | ConvertTo-Json
    $updated = Invoke-RestMethod -Uri "$API_URL/clients/$($client.id)" -Method Put -Headers $headers -Body $updateData
    Write-Host "   ✓ Update Client: OK" -ForegroundColor Green
    
    # Delete Client
    Invoke-RestMethod -Uri "$API_URL/clients/$($client.id)" -Method Delete -Headers $headers
    Write-Host "   ✓ Delete Client: OK" -ForegroundColor Green
    
} catch {
    Write-Host "❌ API CRUD operations failed: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Test 5: Stats Endpoint
Write-Host "5. Testing Dashboard Stats..." -ForegroundColor Yellow
try {
    $stats = Invoke-RestMethod -Uri "$API_URL/stats" -Method Get -Headers $headers
    Write-Host "✅ Stats endpoint working" -ForegroundColor Green
    Write-Host "   - Active Clients: $($stats.active_clients_count)" -ForegroundColor Gray
    Write-Host "   - Pending Tasks: $($stats.pending_tasks_count)" -ForegroundColor Gray
    Write-Host "   - Total MRR: $($stats.total_mrr) EUR" -ForegroundColor Gray
} catch {
    Write-Host "❌ Stats endpoint failed" -ForegroundColor Red
}
Write-Host ""

# Test 6: Frontend Routes
Write-Host "6. Testing Frontend Routes..." -ForegroundColor Yellow
$routes = @(
    @{ Path = "/login"; Name = "Login Page" },
    @{ Path = "/"; Name = "Dashboard" },
    @{ Path = "/clients"; Name = "Clients Page" },
    @{ Path = "/tasks"; Name = "Tasks Page" },
    @{ Path = "/finances"; Name = "Finances Page" },
    @{ Path = "/meeting-notes"; Name = "Meeting Notes Page" }
)

foreach ($route in $routes) {
    try {
        $response = Invoke-WebRequest -Uri "$FRONTEND_URL$($route.Path)" -Method Get -TimeoutSec 3 -MaximumRedirection 0 -ErrorAction SilentlyContinue
        if ($response.StatusCode -in @(200, 307, 308)) {
            Write-Host "   ✓ $($route.Name): OK" -ForegroundColor Green
        }
    } catch {
        if ($_.Exception.Response.StatusCode -in @(307, 308)) {
            Write-Host "   ✓ $($route.Name): OK (redirect)" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  $($route.Name): $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }
}
Write-Host ""

# Summary
Write-Host "=" -NoNewline -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan
Write-Host "  ✨ Full-Stack Tests Completed!" -ForegroundColor Green
Write-Host "=" -NoNewline -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 Services Status:" -ForegroundColor Cyan
Write-Host "   - Backend API:  ✓ Running on $API_URL" -ForegroundColor Green
Write-Host "   - Frontend:     ✓ Running on $FRONTEND_URL" -ForegroundColor Green
Write-Host "   - Database:     ✓ Connected and working" -ForegroundColor Green
Write-Host ""
Write-Host "🔗 Quick Links:" -ForegroundColor Cyan
Write-Host "   - App:          $FRONTEND_URL" -ForegroundColor White
Write-Host "   - API Docs:     $API_URL/docs" -ForegroundColor White
Write-Host ""
Write-Host "🎉 Your Aetheria OS is fully operational!" -ForegroundColor Green
Write-Host ""
