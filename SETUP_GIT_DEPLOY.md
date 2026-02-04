# Setup Git & Déploiement

## 🗑️ 1. Supprimer merino-chats sur le serveur

```bash
# Se connecter au serveur
ssh berou@srv844221

# Supprimer le dossier (avec confirmation)
cd ~
rm -rf merino-chats/

# Vérifier que c'est bien supprimé
ls
# Tu devrais voir : n8n-stack, postgres-global, nocodb, n8n-certs
```

---

## 🔗 2. Lier ton code au Git

### Sur ton PC (local)

**D'abord, donne-moi ton URL Git** (exemple: `https://github.com/ton-user/ton-repo.git`)

Ensuite, lance ces commandes :

```powershell
# Aller dans le projet
cd C:\Users\berou\AetherIa\AppWebCRMInterne

# Ajouter le remote Git
git remote add origin https://github.com/TON-USER/TON-REPO.git

# Vérifier que c'est bien ajouté
git remote -v

# Ajouter tous les fichiers (le .gitignore protège les .env)
git add .

# Commit initial
git commit -m "Initial commit - CRM multi-business ready"

# Push sur GitHub
git push -u origin master
```

---

## 🚀 3. Déployer sur le serveur

### Option A : Via Git (Recommandé)

```bash
# Sur le serveur
ssh berou@srv844221

# Créer le dossier pour le premier CRM
mkdir ~/crm-web-agency
cd ~/crm-web-agency

# Cloner ton repo
git clone https://github.com/TON-USER/TON-REPO.git .

# Créer le .env de production
nano .env
```

**Contenu du `.env` (à adapter) :**

```bash
# Database
DATABASE_URL=postgresql+asyncpg://crm_web_user:MOT_DE_PASSE_SECURISE@postgres_global:5432/crm_web_agency

# JWT Secret (GÉNÉRER UNE VRAIE CLÉ !)
SECRET_KEY=$(openssl rand -hex 32)
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# Business Config
BUSINESS_TYPE=web_agency
BUSINESS_NAME=Agence Aetheria
N8N_WEBHOOK_URL=https://agenceaetheria.com/webhook/crm-web-agency

# Cors (optionnel)
ALLOWED_ORIGINS=https://app-web.agenceaetheria.com
```

---

## 🐳 4. Préparer le Docker Compose pour production

### Créer un fichier `docker-compose.prod.yml`

Tu as déjà un `docker-compose.prod.yml` dans ton projet. On va l'améliorer pour la prod serveur.

---

## 📝 Commandes de déploiement rapides

```bash
# Sur le serveur, dans ~/crm-web-agency

# Première installation
docker-compose -f docker-compose.prod.yml up -d --build

# Initialiser la DB
docker exec -it crm_web_agency_backend python init_db.py

# Voir les logs
docker-compose -f docker-compose.prod.yml logs -f

# Mettre à jour (après un push Git)
git pull
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## ✅ Checklist avant le push

- [x] `.gitignore` protège les `.env`
- [ ] Code commité localement
- [ ] Remote Git configuré
- [ ] Push sur GitHub réussi
- [ ] `.env.production.example` créé (template sans secrets)

---

## 🔐 Sécurité : Ne JAMAIS commit

❌ `.env`
❌ `.env.production`
❌ Mots de passe
❌ `SECRET_KEY`
❌ Tokens API

✅ `.env.production.example` (avec des valeurs factices)
