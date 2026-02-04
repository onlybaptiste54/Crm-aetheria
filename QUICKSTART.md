# 🚀 Démarrage Ultra-Rapide

## Option 1 : Script PowerShell (Recommandé)

```powershell
.\start.ps1
```

## Option 2 : Commandes Manuelles

### 1. Démarrer Docker Compose

```powershell
docker-compose up --build -d
```

### 2. Attendre 10 secondes que les services démarrent

```powershell
Start-Sleep -Seconds 10
```

### 3. Initialiser la DB

```powershell
docker exec aetheria_backend python init_db.py
```

## 📱 Accès

- **API**: http://localhost:8000
- **Docs**: http://localhost:8000/docs
- **Frontend**: http://localhost:3000

## 🔐 Credentials

- **Email**: `admin@aetheria.local`
- **Password**: `admin123`

## 🧪 Test de l'API

### 1. Login

```powershell
$response = Invoke-RestMethod -Uri "http://localhost:8000/auth/token" -Method Post -Body @{username="admin@aetheria.local"; password="admin123"} -ContentType "application/x-www-form-urlencoded"
$token = $response.access_token
```

### 2. Créer un client

```powershell
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

$client = @{
    company_name = "Test Company"
    contact_person = "John Doe"
    status = "Prospect"
    priority = "High"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/clients" -Method Post -Headers $headers -Body $client
```

### 3. Lister les clients

```powershell
Invoke-RestMethod -Uri "http://localhost:8000/clients" -Method Get -Headers $headers
```

## 🛑 Arrêter

```powershell
docker-compose down
```

## 📊 Voir les logs

```powershell
# Tous les logs
docker-compose logs -f

# Backend seulement
docker-compose logs -f backend

# Database seulement
docker-compose logs -f db
```

## 🔧 Troubleshooting

### Les containers ne démarrent pas

```powershell
# Vérifier Docker
docker --version

# Voir les containers
docker ps -a

# Supprimer et recréer
docker-compose down -v
docker-compose up --build
```

### La DB ne s'initialise pas

```powershell
# Vérifier les logs du backend
docker-compose logs backend

# Réessayer l'init manuellement
docker exec -it aetheria_backend python init_db.py
```

### Port déjà utilisé

Si le port 8000 ou 3000 est déjà utilisé, modifiez le `.env` :

```env
BACKEND_PORT=8001
```

Puis relancez :

```powershell
docker-compose down
docker-compose up -d
```
