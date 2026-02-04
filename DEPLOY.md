# 🚀 Guide de Déploiement - VPS Production

## 📋 Prérequis VPS

- Ubuntu 20.04+ / Debian 11+
- Docker & Docker Compose installés
- Git installé
- Ports 80, 443, 8000, 3000 ouverts
- Nom de domaine (optionnel mais recommandé)

## 🔧 Installation sur le VPS

### 1. Installer Docker (si pas déjà fait)

```bash
# Mettre à jour le système
sudo apt update && sudo apt upgrade -y

# Installer Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Installer Docker Compose
sudo apt install docker-compose-plugin -y

# Ajouter votre user au groupe docker
sudo usermod -aG docker $USER
newgrp docker
```

### 2. Cloner le repository

```bash
# Se connecter au VPS
ssh user@your-vps-ip

# Cloner le repo (remplacer par ton URL Git)
git clone https://github.com/ton-username/AetheriaOS-CRM.git
cd AetheriaOS-CRM

# OU si tu push depuis ta machine locale:
# Sur ta machine locale:
git remote add origin https://github.com/ton-username/AetheriaOS-CRM.git
git push -u origin master

# Puis sur le VPS:
git pull origin master
```

### 3. Configuration

```bash
# Copier le fichier d'environnement
cp .env.production.example .env

# Éditer avec nano ou vim
nano .env
```

**IMPORTANT** : Modifie ces valeurs :
```env
POSTGRES_PASSWORD=Un_Mot_De_Passe_Fort_123!
SECRET_KEY=$(openssl rand -hex 32)  # Générer une clé aléatoire
ADMIN_PASSWORD=Ton_Mot_De_Passe_Admin_Fort
```

### 4. Lancer l'application

```bash
# Build et démarrer les containers
docker compose -f docker-compose.prod.yml up -d --build

# Vérifier que tout tourne
docker compose -f docker-compose.prod.yml ps

# Voir les logs
docker compose -f docker-compose.prod.yml logs -f
```

### 5. Initialiser la base de données

```bash
# Créer les tables et l'admin
docker exec aetheria_backend_prod python init_db.py

# OU utiliser le script create_admin.py
docker exec aetheria_backend_prod python create_admin.py
```

### 6. Tester

```bash
# Tester le backend
curl http://localhost:8000

# Tester le frontend (depuis un navigateur)
http://your-vps-ip:3000
```

## 🌐 Configuration Nginx (Reverse Proxy + HTTPS)

### 1. Installer Nginx et Certbot

```bash
sudo apt install nginx certbot python3-certbot-nginx -y
```

### 2. Configuration Nginx

```bash
sudo nano /etc/nginx/sites-available/aetheria
```

Colle cette configuration :

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        rewrite ^/api/(.*) /$1 break;
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Activer le site
sudo ln -s /etc/nginx/sites-available/aetheria /etc/nginx/sites-enabled/

# Tester la config
sudo nginx -t

# Redémarrer Nginx
sudo systemctl restart nginx
```

### 3. Activer HTTPS avec Let's Encrypt

```bash
sudo certbot --nginx -d your-domain.com
```

## 🔄 Mises à jour

```bash
# Pull les dernières modifications
git pull origin master

# Rebuild et redémarrer
docker compose -f docker-compose.prod.yml up -d --build

# Ou juste redémarrer sans rebuild
docker compose -f docker-compose.prod.yml restart
```

## 📊 Monitoring & Logs

```bash
# Voir les logs en temps réel
docker compose -f docker-compose.prod.yml logs -f

# Logs d'un service spécifique
docker compose -f docker-compose.prod.yml logs -f backend

# Statistiques des containers
docker stats

# Espace disque
df -h
docker system df
```

## 🛡️ Sécurité

### Firewall (UFW)

```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### Backup automatique de la base

```bash
# Créer un script de backup
sudo nano /usr/local/bin/backup-aetheria.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/backups/aetheria"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup de la base PostgreSQL
docker exec aetheria_db_prod pg_dump -U aetheria aetheria_crm > $BACKUP_DIR/db_$DATE.sql

# Garder seulement les 7 derniers backups
find $BACKUP_DIR -name "db_*.sql" -mtime +7 -delete

echo "Backup terminé: $BACKUP_DIR/db_$DATE.sql"
```

```bash
# Rendre exécutable
sudo chmod +x /usr/local/bin/backup-aetheria.sh

# Ajouter au cron (tous les jours à 2h du matin)
sudo crontab -e
# Ajouter: 0 2 * * * /usr/local/bin/backup-aetheria.sh
```

## 🔥 Commandes utiles

```bash
# Arrêter tout
docker compose -f docker-compose.prod.yml down

# Arrêter et supprimer les volumes (ATTENTION: supprime les données !)
docker compose -f docker-compose.prod.yml down -v

# Redémarrer un service
docker compose -f docker-compose.prod.yml restart backend

# Reconstruire un service
docker compose -f docker-compose.prod.yml up -d --build backend

# Voir les ressources utilisées
docker stats

# Nettoyer Docker
docker system prune -a
```

## 🆘 Dépannage

### Le frontend ne se connecte pas au backend

Vérifie la variable `NEXT_PUBLIC_API_URL` dans le `.env` :
```env
# En production avec Nginx
NEXT_PUBLIC_API_URL=https://your-domain.com/api

# Ou sans Nginx
NEXT_PUBLIC_API_URL=http://your-vps-ip:8000
```

### Erreur de base de données

```bash
# Vérifier que Postgres tourne
docker compose -f docker-compose.prod.yml ps

# Se connecter à Postgres
docker exec -it aetheria_db_prod psql -U aetheria -d aetheria_crm

# Lister les tables
\dt

# Quitter
\q
```

## 📧 Support

Si tu as des problèmes, check les logs :
```bash
docker compose -f docker-compose.prod.yml logs --tail=100
```
