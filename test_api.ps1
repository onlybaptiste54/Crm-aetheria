# Script de test de l'API Aetheria

Write-Host "🧪 Testing Aetheria API..." -ForegroundColor Cyan
Write-Host ""

$API_URL = "http://localhost:8000"
$ADMIN_EMAIL = "admin@aetheria.local"
$ADMIN_PASSWORD = "admin123"

# Test 1: Health check
Write-Host "1. Testing health endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$API_URL/" -Method Get
    Write-Host "✅ API is running: $($response.message)" -ForegroundColor Green
} catch {
    Write-Host "❌ API is not responding" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Test 2: Login
Write-Host "2. Testing login..." -ForegroundColor Yellow
try {
    $loginBody = @{
        username = $ADMIN_EMAIL
        password = $ADMIN_PASSWORD
    }
    $response = Invoke-RestMethod -Uri "$API_URL/auth/token" -Method Post -Body $loginBody -ContentType "application/x-www-form-urlencoded"
    $token = $response.access_token
    Write-Host "✅ Login successful" -ForegroundColor Green
    Write-Host "   Token: $($token.Substring(0, 50))..." -ForegroundColor Gray
} catch {
    Write-Host "❌ Login failed: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Test 3: Get current user
Write-Host "3. Testing user profile..." -ForegroundColor Yellow
try {
    $headers = @{
        "Authorization" = "Bearer $token"
    }
    $user = Invoke-RestMethod -Uri "$API_URL/users/me" -Method Get -Headers $headers
    Write-Host "✅ User profile retrieved" -ForegroundColor Green
    Write-Host "   Email: $($user.email)" -ForegroundColor Gray
    Write-Host "   Role: $($user.role)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Failed to get user profile: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Test 4: Create a client
Write-Host "4. Testing client creation..." -ForegroundColor Yellow
try {
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    $clientData = @{
        company_name = "Test Company $(Get-Date -Format 'HHmmss')"
        contact_person = "John Doe"
        status = "Prospect"
        pipeline_stage = "New"
        priority = "High"
        sector = "IT"
        notes = "Test client created by PowerShell script"
    } | ConvertTo-Json
    
    $client = Invoke-RestMethod -Uri "$API_URL/clients" -Method Post -Headers $headers -Body $clientData
    Write-Host "✅ Client created" -ForegroundColor Green
    Write-Host "   ID: $($client.id)" -ForegroundColor Gray
    Write-Host "   Company: $($client.company_name)" -ForegroundColor Gray
    $clientId = $client.id
} catch {
    Write-Host "❌ Failed to create client: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Test 5: List clients
Write-Host "5. Testing client listing..." -ForegroundColor Yellow
try {
    $clients = Invoke-RestMethod -Uri "$API_URL/clients" -Method Get -Headers $headers
    Write-Host "✅ Clients retrieved: $($clients.Count) client(s)" -ForegroundColor Green
    if ($clients.Count -gt 0) {
        Write-Host "   Latest: $($clients[0].company_name)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Failed to list clients: $_" -ForegroundColor Red
}
Write-Host ""

# Test 6: Create a task
Write-Host "6. Testing task creation..." -ForegroundColor Yellow
try {
    $taskData = @{
        title = "Test Task $(Get-Date -Format 'HHmmss')"
        description = "This is a test task"
        status = "Todo"
        priority = "High"
        due_date = (Get-Date).AddDays(7).ToString("yyyy-MM-ddTHH:mm:ss")
        tags = @("test", "api")
        client_id = $clientId
    } | ConvertTo-Json
    
    $task = Invoke-RestMethod -Uri "$API_URL/tasks" -Method Post -Headers $headers -Body $taskData
    Write-Host "✅ Task created" -ForegroundColor Green
    Write-Host "   ID: $($task.id)" -ForegroundColor Gray
    Write-Host "   Title: $($task.title)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Failed to create task: $_" -ForegroundColor Red
}
Write-Host ""

# Test 7: Get dashboard stats
Write-Host "7. Testing dashboard stats..." -ForegroundColor Yellow
try {
    $stats = Invoke-RestMethod -Uri "$API_URL/stats" -Method Get -Headers $headers
    Write-Host "✅ Stats retrieved" -ForegroundColor Green
    Write-Host "   Active Clients: $($stats.active_clients_count)" -ForegroundColor Gray
    Write-Host "   Pending Tasks: $($stats.pending_tasks_count)" -ForegroundColor Gray
    Write-Host "   Total MRR: $($stats.total_mrr) EUR" -ForegroundColor Gray
} catch {
    Write-Host "❌ Failed to get stats: $_" -ForegroundColor Red
}
Write-Host ""

Write-Host "=" -NoNewline -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan
Write-Host "  ✨ All tests completed!" -ForegroundColor Green
Write-Host "=" -NoNewline -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan
Write-Host ""
Write-Host "View API docs: $API_URL/docs" -ForegroundColor Yellow
Write-Host ""
