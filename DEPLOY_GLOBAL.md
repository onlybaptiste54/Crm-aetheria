# Déploiement CRM avec PostgreSQL Global

Ce guide permet de faire tourner le CRM en utilisant **votre PostgreSQL global existant** (postgres_global) au lieu d'un container Postgres dédié. Une seule instance Postgres sur le VPS.

## Prérequis sur le VPS

- **postgres-global** déjà lancé (`~/postgres-global/`)
- **n8n-stack** avec Traefik déjà lancé (`~/n8n-stack/`)
- Le CRM sera accessible sur **https://crm.agenceaetheria.com**

---

## 1. Créer la base et l'utilisateur sur Postgres Global

```bash
# Se connecter au container Postgres global
docker exec -it postgres_global psql -U nocodb_user -d merino

# Dans psql, exécuter :
CREATE USER aetheria WITH ENCRYPTED PASSWORD 'VotreMotDePasseCRM123!';
CREATE DATABASE aetheria_crm OWNER aetheria;
GRANT ALL PRIVILEGES ON DATABASE aetheria_crm TO aetheria;
\c aetheria_crm
GRANT ALL ON SCHEMA public TO aetheria;

# Quitter
\q
```

Remplacez `VotreMotDePasseCRM123!` par le mot de passe que vous mettrez dans le `.env` du CRM.

---

## 2. Vérifier les noms des réseaux Docker

```bash
docker network ls
```

Vous devez voir au moins :
- `postgres-global_default` (créé par le compose dans ~/postgres-global)
- Un réseau pour Traefik/n8n, souvent `n8n-stack_default` ou `n8nstack_default`

Si le réseau Traefik a un autre nom (ex: `n8nstack_default`), éditez `docker-compose.prod.global.yml` et remplacez `n8n-stack_default` par le bon nom partout.

---

## 3. Cloner le projet et configurer

```bash
cd ~/Crm-aetheria   # ou là où vous avez cloné

# Copier le fichier d'environnement pour la config "global"
cp .env.production.global.example .env

# Éditer
nano .env
```

Renseignez au minimum :
- `CRM_POSTGRES_USER=aetheria`
- `CRM_POSTGRES_PASSWORD=` le même mot de passe que celui utilisé à l'étape 1
- `CRM_POSTGRES_DB=aetheria_crm`
- `SECRET_KEY=` (générez avec `openssl rand -hex 32`)
- `ADMIN_EMAIL` et `ADMIN_PASSWORD`

Sauvegardez (Ctrl+X, Y, Entrée).

---

## 4. Lancer le CRM (sans container Postgres dédié)

```bash
docker compose -f docker-compose.prod.global.yml up -d --build
```

Attendre la fin du build (2–5 min), puis :

```bash
# Initialiser les tables et l'admin
docker exec aetheria_backend_prod python init_db.py

# Vérifier
docker compose -f docker-compose.prod.global.yml ps
```

---

## 5. DNS et Traefik

Ajoutez un enregistrement DNS pour le sous-domaine :

- **crm.agenceaetheria.com** → IP de votre VPS (même que agenceaetheria.com)

Traefik (déjà dans n8n-stack) prendra en charge le certificat SSL pour `crm.agenceaetheria.com`.

---

## 6. Accès

- **App** : https://crm.agenceaetheria.com  
- **Identifiants** : ceux définis dans `.env` (ADMIN_EMAIL / ADMIN_PASSWORD)

---

## Résumé

| Avant (docker-compose.prod.yml) | Avec Postgres global (docker-compose.prod.global.yml) |
|---------------------------------|------------------------------------------------------|
| 1 container Postgres dédié      | 0 – utilise postgres_global                         |
| Réseau isolé                    | Rejoint postgres-global + réseau Traefik            |
| Ports 8000, 3000 exposés       | Derrière Traefik, HTTPS sur crm.agenceaetheria.com   |

Vous gardez un seul Postgres pour NocoDB, n8n et le CRM.
