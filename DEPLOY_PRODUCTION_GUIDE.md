# Guide de Déploiement en Production

## 🏗️ Architecture de Déploiement

### Infrastructure actuelle
- **N8n** : https://agenceaetheria.com (port 5678)
- **PostgreSQL Global** : port 5432 (partagé)
- **Traefik** : Reverse proxy avec SSL automatique

### Stratégie : Instances séparées par client

```
srv844221/
├── n8n-stack/              # N8n existant
├── postgres-global/         # PostgreSQL partagé
├── crm-web-agency/         # 🆕 CRM Client 1 (Web Agency)
├── crm-real-estate/        # 🆕 CRM Client 2 (Immobilier)
└── crm-airbnb/             # 🆕 CRM Client 3 (Airbnb)
```

---

## 📦 Déploiement Instance 1 : Web Agency

### 1. Préparer le PostgreSQL

```bash
# Se connecter au PostgreSQL global
docker exec -it postgres_global psql -U nocodb_user -d merino

# Créer la base de données pour le CRM
CREATE DATABASE crm_web_agency;
CREATE USER crm_web_user WITH ENCRYPTED PASSWORD 'votre_mot_de_passe_securise';
GRANT ALL PRIVILEGES ON DATABASE crm_web_agency TO crm_web_user;
\q
```

### 2. Créer la structure sur le serveur

```bash
cd ~
mkdir crm-web-agency
cd crm-web-agency
```

### 3. Créer le docker-compose.yml

```yaml
version: '3.8'

services:
  backend:
    image: ghcr.io/votre-user/crm-backend:latest  # Ou build local
    container_name: crm_web_agency_backend
    restart: always
    environment:
      # Database
      DATABASE_URL: postgresql+asyncpg://crm_web_user:votre_mot_de_passe_securise@postgres_global:5432/crm_web_agency
      
      # JWT
      SECRET_KEY: ${SECRET_KEY}
      ALGORITHM: HS256
      ACCESS_TOKEN_EXPIRE_MINUTES: 10080  # 7 jours
      
      # Business Config
      BUSINESS_TYPE: web_agency
      BUSINESS_NAME: "Agence Aetheria"
      N8N_WEBHOOK_URL: https://agenceaetheria.com/webhook/crm-web-agency
      
    volumes:
      - ./uploads:/app/uploads
    networks:
      - n8n-stack_default  # Réseau partagé avec n8n
    labels:
      - traefik.enable=true
      - traefik.http.routers.crm-web.rule=Host(`crm-web.agenceaetheria.com`)
      - traefik.http.routers.crm-web.tls=true
      - traefik.http.routers.crm-web.entrypoints=web,websecure
      - traefik.http.routers.crm-web.tls.certresolver=mytlschallenge
      - traefik.http.services.crm-web.loadbalancer.server.port=8000

  frontend:
    image: ghcr.io/votre-user/crm-frontend:latest
    container_name: crm_web_agency_frontend
    restart: always
    environment:
      NEXT_PUBLIC_API_URL: https://crm-web.agenceaetheria.com
    networks:
      - n8n-stack_default
    labels:
      - traefik.enable=true
      - traefik.http.routers.crm-web-app.rule=Host(`app-web.agenceaetheria.com`)
      - traefik.http.routers.crm-web-app.tls=true
      - traefik.http.routers.crm-web-app.entrypoints=web,websecure
      - traefik.http.routers.crm-web-app.tls.certresolver=mytlschallenge
      - traefik.http.services.crm-web-app.loadbalancer.server.port=3000

networks:
  n8n-stack_default:
    external: true

volumes:
  uploads:
```

### 4. Créer le fichier .env

```bash
cat > .env << 'EOF'
SECRET_KEY=$(openssl rand -hex 32)  # Générer une clé unique
EOF
```

### 5. Initialiser la base de données

```bash
# Une fois les containers lancés
docker exec -it crm_web_agency_backend python init_db.py

# Ou manuellement via migration
docker exec -it crm_web_agency_backend alembic upgrade head
```

### 6. Créer l'utilisateur admin

```bash
docker exec -it crm_web_agency_backend python create_admin.py
```

---

## 🔄 Déployer les autres clients (Immobilier, Airbnb)

Répétez le processus en changeant :

### CRM Real Estate

```bash
# Database
CREATE DATABASE crm_real_estate;

# Dossier
mkdir ~/crm-real-estate

# Variables d'environnement
BUSINESS_TYPE: real_estate
BUSINESS_NAME: "Agence Immobilière Client X"
N8N_WEBHOOK_URL: https://agenceaetheria.com/webhook/crm-real-estate

# Domaines
crm-immo.agenceaetheria.com (backend)
app-immo.agenceaetheria.com (frontend)
```

### CRM Airbnb

```bash
# Database
CREATE DATABASE crm_airbnb;

# Dossier
mkdir ~/crm-airbnb

# Variables d'environnement
BUSINESS_TYPE: airbnb
BUSINESS_NAME: "Client Airbnb Y"
N8N_WEBHOOK_URL: https://agenceaetheria.com/webhook/crm-airbnb

# Domaines
crm-airbnb.agenceaetheria.com (backend)
app-airbnb.agenceaetheria.com (frontend)
```

---

## 🔗 Intégration N8n

### Configuration des Webhooks

Chaque instance CRM a son propre webhook N8n :

```
Web Agency:    https://agenceaetheria.com/webhook/crm-web-agency
Real Estate:   https://agenceaetheria.com/webhook/crm-real-estate
Airbnb:        https://agenceaetheria.com/webhook/crm-airbnb
```

### Workflow N8n type

1. **Webhook Trigger** → Reçoit les données du CRM
2. **Filter** → Par type de business
3. **Email Template** → Template personnalisé par business
4. **Send Email** → Envoi via SMTP
5. **HTTP Request** → Callback au CRM pour tracking

---

## 🎨 Personnalisation par Business Type

### Backend : Configuration dynamique

Le backend s'adapte automatiquement selon `BUSINESS_TYPE` :

**Web Agency** :
- Champs : `project_type`, `dev_stage`, `budget`
- Statuts : "Prospect", "Dev", "Delivered"

**Real Estate** :
- Champs : `property_type`, `buyer_type`, `estimation_value`
- Statuts : "Lead", "Estimation", "Sold"

**Airbnb** :
- Champs : `acquisition_type`, `revenue`, `booking_link_clicked`
- Statuts : "Lead", "Owner", "Active"

---

## 🔒 Sécurité

### Checklist
- ✅ PostgreSQL NOT exposé publiquement (interne au réseau Docker)
- ✅ SSL automatique via Traefik + Let's Encrypt
- ✅ Chaque instance CRM a sa propre DB (isolation)
- ✅ JWT avec SECRET_KEY unique par instance
- ✅ Backup automatique PostgreSQL

### Backup Script

```bash
#!/bin/bash
# ~/backup-crm.sh

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/berou/backups"

# Backup chaque DB
docker exec postgres_global pg_dump -U nocodb_user crm_web_agency > $BACKUP_DIR/crm_web_agency_$TIMESTAMP.sql
docker exec postgres_global pg_dump -U nocodb_user crm_real_estate > $BACKUP_DIR/crm_real_estate_$TIMESTAMP.sql
docker exec postgres_global pg_dump -U nocodb_user crm_airbnb > $BACKUP_DIR/crm_airbnb_$TIMESTAMP.sql

# Garder seulement 30 derniers jours
find $BACKUP_DIR -name "*.sql" -mtime +30 -delete
```

Ajouter au crontab :
```bash
crontab -e
# Backup quotidien à 2h du matin
0 2 * * * /home/berou/backup-crm.sh
```

---

## 📊 Monitoring

### Vérifier les containers

```bash
docker ps --filter "name=crm_"
```

### Logs

```bash
# Backend Web Agency
docker logs -f crm_web_agency_backend

# Frontend Web Agency
docker logs -f crm_web_agency_frontend
```

### Health Check

```bash
# API Status
curl https://crm-web.agenceaetheria.com/health

# Frontend Status
curl https://app-web.agenceaetheria.com
```

---

## 🚀 Commandes de déploiement rapides

### Première installation

```bash
cd ~/crm-web-agency
docker-compose up -d
docker exec -it crm_web_agency_backend python init_db.py
```

### Mise à jour

```bash
cd ~/crm-web-agency
docker-compose pull
docker-compose up -d
```

### Redémarrage

```bash
docker-compose restart
```

---

## 💰 Coûts et Avantages

### Comparaison

| Approche | Coût Serveur | Complexité | Isolation | Customisation |
|----------|--------------|------------|-----------|---------------|
| **True SaaS Multi-tenant** | 1 serveur | ⭐⭐⭐⭐ | ⚠️ Risqué | ❌ Limitée |
| **Instances séparées** | 1 serveur | ⭐⭐ | ✅ Totale | ✅ Maximale |
| **Serveurs séparés** | 3+ serveurs | ⭐ | ✅ Totale | ✅ Maximale |

### Votre choix actuel : Instances séparées

**Avantages** :
- ✅ Un seul serveur (économique)
- ✅ Isolation complète des données
- ✅ Customisation facile par client
- ✅ Backup/restore indépendant
- ✅ Facturation premium ("dedicated instance")

**Inconvénient** :
- ⚠️ Plus de containers à gérer (mais Docker simplifie)

---

## 🎯 Quand passer au SaaS ?

Envisager le True Multi-Tenant SaaS quand :
1. **Vous avez 10+ clients** avec le même workflow
2. **Les features sont standardisées** (pas de custom par client)
3. **Vous voulez proposer self-service signup**
4. **Le coût serveur devient critique**

Pour l'instant : **Restez sur instances séparées** 👍
