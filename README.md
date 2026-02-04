<<<<<<< HEAD
# Crm-aetheria
=======
# Aetheria Internal OS

CRM/ERP interne self-hosted pour gestion clients, tâches, finances et notes de réunion.

## 🏗️ Architecture

- **Backend**: FastAPI (Python 3.12) + SQLAlchemy Async + PostgreSQL
- **Frontend**: Next.js 14+ (App Router) + TypeScript + TailwindCSS
- **Database**: PostgreSQL 16
- **Deployment**: Docker Compose

## 📁 Structure du Projet

```
AppWebCRMInterne/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py          # Routes CRUD directes (pas de routers séparés)
│   │   ├── models.py        # Tous les modèles SQLAlchemy
│   │   ├── schemas.py       # Tous les schémas Pydantic
│   │   ├── database.py      # Connexion DB
│   │   └── auth.py          # Logique JWT
│   ├── init_db.py           # Script d'initialisation DB + Admin user
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   └── (Next.js app)
├── docker-compose.yml
├── .env
└── README.md
```

## 🚀 Démarrage Rapide

### 1. Cloner et configurer

```bash
cd c:\Users\berou\AetherIa\AppWebCRMInterne
```

Le fichier `.env` est déjà créé avec les variables par défaut. **Changez le `SECRET_KEY` en production !**

### 2. Lancer les services Docker

```bash
# Build et démarrage de tous les services
docker-compose up --build

# Ou en mode détaché (background)
docker-compose up -d --build
```

### 3. Initialiser la base de données

Une fois les containers lancés, exécutez le script d'init dans le container backend :

```bash
docker exec -it aetheria_backend python init_db.py
```

Cela va :
- Créer toutes les tables PostgreSQL
- Créer l'utilisateur admin (email: `admin@aetheria.local`, password: `admin123`)

### 4. Accéder aux services

- **API Backend**: http://localhost:8000
- **API Docs (Swagger)**: http://localhost:8000/docs
- **Frontend**: http://localhost:3000

## 🔐 Authentification

### Login via l'API

```bash
curl -X POST "http://localhost:8000/auth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin@aetheria.local&password=admin123"
```

Retourne :
```json
{
  "access_token": "eyJhbGc...",
  "token_type": "bearer"
}
```

### Utiliser le token

Ajoutez le header suivant à toutes les requêtes protégées :
```
Authorization: Bearer <votre_token>
```

## 📊 Endpoints Principaux

### Auth
- `POST /auth/token` - Login
- `GET /users/me` - Profil user courant

### Clients (CRM)
- `GET /clients` - Liste clients
- `POST /clients` - Créer client
- `GET /clients/{id}` - Détail client
- `PUT /clients/{id}` - Modifier client
- `DELETE /clients/{id}` - Supprimer client

### Tasks (Kanban)
- `GET /tasks` - Liste tâches
- `POST /tasks` - Créer tâche
- `GET /tasks/{id}` - Détail tâche
- `PUT /tasks/{id}` - Modifier tâche
- `DELETE /tasks/{id}` - Supprimer tâche

### Finances
- `GET /finances` - Liste finances
- `POST /finances` - Créer finance
- `GET /finances/{id}` - Détail finance
- `PUT /finances/{id}` - Modifier finance
- `DELETE /finances/{id}` - Supprimer finance

### Meeting Notes
- `GET /meeting-notes` - Liste notes
- `POST /meeting-notes` - Créer note
- `GET /meeting-notes/{id}` - Détail note
- `PUT /meeting-notes/{id}` - Modifier note
- `DELETE /meeting-notes/{id}` - Supprimer note

### Utils
- `POST /upload` - Upload fichier (PDF, etc.)
- `GET /stats` - Stats dashboard (MRR, dépenses, clients actifs, etc.)

## 🛠️ Commandes Utiles

### Docker

```bash
# Voir les logs
docker-compose logs -f

# Voir les logs d'un service spécifique
docker-compose logs -f backend

# Arrêter tous les services
docker-compose down

# Arrêter et supprimer les volumes (⚠️ supprime la DB)
docker-compose down -v

# Rebuild un service spécifique
docker-compose up -d --build backend

# Entrer dans le container backend
docker exec -it aetheria_backend bash

# Entrer dans le container DB
docker exec -it aetheria_db psql -U aetheria -d aetheria_crm
```

### Backend (local sans Docker)

```bash
cd backend

# Activer venv
.\venv\Scripts\Activate.ps1  # Windows PowerShell
# ou
source venv/bin/activate  # Linux/Mac

# Installer les dépendances
pip install -r requirements.txt

# Lancer le serveur (hot-reload)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Init DB en local
python init_db.py
```

## 🗄️ Modèles de Données

### User
- Admin par défaut pour l'authentification

### Client
- `company_name`, `contact_person`, `status`, `pipeline_stage`, `priority`, `sector`, `company_size`, `phone`, `email`, `next_action_date`, `notes`

### Task
- `title`, `description`, `status` (Kanban), `priority`, `due_date`, `tags`, `client_id` (FK optionnel)

### Finance
- `name`, `type` (Subscription/One-off), `category`, `amount`, `billing_date`, `renewal_date`, `is_paid`, `invoice_path`

### MeetingNote
- `title`, `date`, `content` (Markdown), `client_id` (FK), `attachments`

## 📝 Notes de Développement

### Architecture "Flat" (Simple)
- **Pas de sur-ingénierie** : Pas de pattern Repository, pas de couches abstraites
- **Tout dans `app/`** : models, schemas, database, auth, main
- **Routes directes dans `main.py`** : Pas de routers séparés pour garder la simplicité
- **Appels SQLAlchemy directs** : Pas de services intermédiaires

### Pourquoi cette approche ?
- Projet mono-utilisateur (vous)
- Maintenabilité > Scalabilité
- Code explicite et facile à modifier
- Moins de fichiers = moins de complexité

## 🔒 Sécurité

- La DB PostgreSQL n'expose **pas** le port 5432 à l'host (interne au réseau Docker)
- JWT avec expiration configurable (par défaut 7 jours)
- Passwords hashés avec bcrypt
- Toutes les routes business protégées par authentification

## 🎨 Frontend Structure

### Pages créées
- **Dashboard** (`/`) - KPIs et vue d'ensemble
- **Clients** (`/clients`) - CRM avec DataTable
- **Tasks** (`/tasks`) - Kanban avec Drag & Drop
- **Finances** (`/finances`) - Gestion dépenses et abonnements
- **Meeting Notes** (`/meeting-notes`) - Comptes-rendus

### Technologies
- Next.js 16 (App Router) + TypeScript
- Shadcn/ui (Radix) + TailwindCSS 4
- TanStack Query pour data fetching
- Zustand pour state management
- @hello-pangea/dnd pour drag & drop

## 📦 Prochaines Étapes

1. ✅ Backend infrastructure + API CRUD
2. ✅ Frontend Next.js (Dashboard, CRM, Kanban, Finances)
3. 🚧 Formulaires de création/édition (modals)
4. 🚧 Système d'upload de fichiers côté front
5. 🚧 Tests (Pytest pour backend, Jest pour frontend)
6. 🚧 Migrations Alembic
7. 🚧 Reverse Proxy Nginx/Caddy + SSL

## 📚 Documentation Complète

- [Backend README](./backend/README.md) - Architecture et API
- [Frontend README](./frontend/README.md) - Structure et composants
- [QUICKSTART.md](./QUICKSTART.md) - Guide de démarrage rapide

---

**Développé pour Aetheria OS** 🚀
>>>>>>> master
