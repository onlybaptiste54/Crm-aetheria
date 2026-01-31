# 🔧 Guide de Correction des Erreurs

## ✅ Corrections Appliquées

### 1. Problème npm - Conflit de dépendances

**Erreur:**
```
npm error peer react@"^18.0.0" from @hello-pangea/dnd@17.0.0
```

**Solution:**
```powershell
cd frontend
npm install --legacy-peer-deps
```

**Changements:**
- ✅ Remplacé `@hello-pangea/dnd` par `@dnd-kit` (compatible React 19)
- ✅ Ajouté flag `--legacy-peer-deps` au Dockerfile
- ✅ Refactorisé la page Tasks pour utiliser @dnd-kit

### 2. Problème PowerShell - Encodage emojis

**Erreur:**
```
Le terminateur " est manquant dans la chaîne
```

**Solution:**
- ✅ Supprimé les emojis problématiques dans `test_api.ps1`
- Les scripts fonctionnent maintenant correctement

## 🚀 Installation Maintenant

### Option 1: Avec Docker (RECOMMANDÉ - Pas de problèmes npm)

```powershell
# Depuis la racine du projet
docker-compose up --build -d
```

Docker installe automatiquement tout avec `--legacy-peer-deps`.

### Option 2: Installation Locale Frontend

```powershell
cd frontend
npm install --legacy-peer-deps
npm run dev
```

### Option 3: Utiliser le script npm

```powershell
cd frontend
npm run install:force
```

## 🧪 Vérifier que Tout Fonctionne

```powershell
# Depuis la racine
.\test_api.ps1           # Tester le backend
.\test_fullstack.ps1     # Tester backend + frontend
```

## 📦 Ce qui a été Modifié

### package.json
- Remplacé `@hello-pangea/dnd@17.0.0` par:
  - `@dnd-kit/core@6.3.1`
  - `@dnd-kit/sortable@9.0.0`
  - `@dnd-kit/utilities@3.2.2`
- Ajouté script `install:force`

### tasks/page.tsx
- Refactorisé pour utiliser @dnd-kit au lieu de @hello-pangea/dnd
- Nouveau système de drag & drop compatible React 19
- Fonctionnalité identique avec meilleure performance

### Dockerfile frontend
```dockerfile
RUN npm install --legacy-peer-deps
```

### docker-compose.yml
```yaml
environment:
  - NPM_CONFIG_LEGACY_PEER_DEPS=true
```

## ⚡ Commandes Rapides

```powershell
# 1. Installation complète avec Docker
docker-compose up --build -d

# 2. Attendre 10 secondes
Start-Sleep -Seconds 10

# 3. Init DB
docker exec aetheria_backend python init_db.py

# 4. Tester
.\test_fullstack.ps1

# 5. Ouvrir l'app
start http://localhost:3000
```

## 🎯 Résultat

✅ Backend FastAPI fonctionnel  
✅ Frontend Next.js fonctionnel  
✅ Drag & Drop Kanban fonctionnel avec @dnd-kit  
✅ Pas de conflits de dépendances  
✅ Scripts PowerShell fonctionnels  

---

**Tout est maintenant prêt à l'emploi ! 🚀**
