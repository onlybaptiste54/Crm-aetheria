# 🚀 Guide d'Installation Complet - Aetheria OS

## Prérequis

- **Docker Desktop** installé et lancé
- **Node.js 20+** (pour le dev local frontend)
- **Python 3.12+** (optionnel, pour dev local backend)

## Installation Rapide (Recommandé)

### Étape 1: Cloner/Naviguer vers le projet

```powershell
cd c:\Users\berou\AetherIa\AppWebCRMInterne
```

### Étape 2: Lancer le script de démarrage

```powershell
.\start.ps1
```

Ce script va:
1. Vérifier que Docker est lancé
2. Build et démarrer tous les containers (db, backend, frontend)
3. Initialiser la base de données
4. Créer l'utilisateur admin

### Étape 3: Accéder à l'application

- **Frontend**: http://localhost:3000
- **API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

**Credentials**:
- Email: `admin@aetheria.local`
- Password: `admin123`

---

## Installation Manuelle (Détaillée)

### 1. Configuration

Le fichier `.env` est déjà créé à la racine avec les bonnes valeurs par défaut.

⚠️ **IMPORTANT**: Changez le `SECRET_KEY` avant de déployer en production!

### 2. Démarrage des Services Docker

```powershell
# Build et démarrage
docker-compose up --build -d

# Attendre que les services soient prêts (10-15 secondes)
Start-Sleep -Seconds 10
```

Vérification:
```powershell
docker ps
```

Vous devriez voir 3 containers:
- `aetheria_db` (PostgreSQL)
- `aetheria_backend` (FastAPI)
- `aetheria_frontend` (Next.js)

### 3. Initialisation de la Base de Données

```powershell
docker exec aetheria_backend python init_db.py
```

Cela va:
- Créer toutes les tables (users, clients, tasks, finances, meeting_notes)
- Insérer l'utilisateur admin

### 4. Vérification

#### Backend
```powershell
# Tester l'API
curl http://localhost:8000

# Ouvrir les docs Swagger
start http://localhost:8000/docs
```

#### Frontend
```powershell
# Ouvrir l'app
start http://localhost:3000
```

---

## Développement Local (Sans Docker)

### Backend

```powershell
cd backend

# Créer et activer venv
python -m venv venv
.\venv\Scripts\Activate.ps1

# Installer dépendances
pip install -r requirements.txt

# Lancer PostgreSQL séparément (via Docker)
docker run -d --name postgres-dev -e POSTGRES_PASSWORD=aetheria_secure_2026 -e POSTGRES_USER=aetheria -e POSTGRES_DB=aetheria_crm -p 5432:5432 postgres:16-alpine

# Modifier DATABASE_URL dans .env pour pointer vers localhost:5432

# Init DB
python init_db.py

# Lancer le serveur
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```powershell
cd frontend

# Installer dépendances
npm install

# Lancer en dev
npm run dev
```

---

## Commandes Utiles

### Docker

```powershell
# Voir les logs en temps réel
docker-compose logs -f

# Logs d'un service spécifique
docker-compose logs -f backend
docker-compose logs -f frontend

# Arrêter les services
docker-compose down

# Supprimer les volumes (⚠️ supprime la DB)
docker-compose down -v

# Rebuild un service
docker-compose up -d --build backend

# Entrer dans un container
docker exec -it aetheria_backend bash
docker exec -it aetheria_frontend sh
```

### Base de Données

```powershell
# Accéder à PostgreSQL CLI
docker exec -it aetheria_db psql -U aetheria -d aetheria_crm

# Dans psql:
\dt                    # Lister les tables
\d users              # Décrire la table users
SELECT * FROM users;  # Voir les users
\q                    # Quitter
```

### Tests

```powershell
# Tester l'API avec PowerShell
.\test_api.ps1

# Tester manuellement avec curl
curl -X POST "http://localhost:8000/auth/token" -H "Content-Type: application/x-www-form-urlencoded" -d "username=admin@aetheria.local&password=admin123"
```

---

## Troubleshooting

### ❌ "Docker is not running"

**Solution**: Lancez Docker Desktop et attendez qu'il soit complètement démarré.

### ❌ "Port 8000 already in use"

**Solution**: Un autre process utilise le port.

```powershell
# Trouver le process
netstat -ano | findstr :8000

# Modifier le port dans .env
# BACKEND_PORT=8001

# Relancer
docker-compose down
docker-compose up -d
```

### ❌ "Frontend ne se connecte pas au backend"

**Solutions**:
1. Vérifier que le backend répond:
   ```powershell
   curl http://localhost:8000
   ```

2. Vérifier le `.env` du frontend:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

3. Vérifier les CORS dans `backend/app/main.py` (déjà configuré pour localhost:3000)

### ❌ "Database initialization failed"

**Solutions**:
1. Vérifier que la DB est lancée:
   ```powershell
   docker ps | findstr aetheria_db
   ```

2. Re-créer la DB:
   ```powershell
   docker-compose down -v
   docker-compose up -d db
   Start-Sleep -Seconds 5
   docker exec aetheria_backend python init_db.py
   ```

### ❌ "Login failed / Token invalide"

**Solutions**:
1. Vérifier les credentials dans `.env`:
   ```env
   ADMIN_EMAIL=admin@aetheria.local
   ADMIN_PASSWORD=admin123
   ```

2. Re-créer l'admin:
   ```powershell
   docker exec -it aetheria_backend python init_db.py
   ```

3. Effacer le localStorage du navigateur (F12 → Application → Local Storage)

---

## Structure des Fichiers

```
AppWebCRMInterne/
├── .env                      # Variables d'environnement
├── docker-compose.yml        # Configuration Docker
├── start.ps1                 # Script de démarrage auto
├── test_api.ps1             # Script de test API
├── README.md                 # Documentation principale
├── QUICKSTART.md            # Démarrage rapide
├── INSTALL.md               # Ce fichier
├── backend/
│   ├── app/                 # Code backend
│   ├── init_db.py          # Script d'init DB
│   ├── Dockerfile
│   └── requirements.txt
└── frontend/
    ├── app/                 # Pages Next.js
    ├── components/          # Composants React
    ├── lib/                 # Utils et API client
    ├── Dockerfile
    ├── package.json
    └── README.md
```

---

## Mise à Jour

Pour mettre à jour l'application:

```powershell
# Pull les derniers changements (si Git)
git pull

# Rebuild les containers
docker-compose down
docker-compose up --build -d

# Re-init la DB si modèles changés
docker exec aetheria_backend python init_db.py
```

---

## Support

En cas de problème:
1. Vérifier les logs: `docker-compose logs -f`
2. Tester l'API: `.\test_api.ps1`
3. Vérifier la doc: `README.md`, `QUICKSTART.md`

**Développé pour Aetheria OS** 🚀
