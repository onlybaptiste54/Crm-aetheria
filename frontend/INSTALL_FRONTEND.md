# Installation Frontend - Aetheria OS

## Problème : Conflit de dépendances npm

Si vous voyez cette erreur:
```
npm error ERESOLVE unable to resolve dependency tree
npm error peer react@"^18.0.0" from @hello-pangea/dnd@17.0.0
```

## Solution: Installer avec --legacy-peer-deps

```powershell
cd frontend
npm install --legacy-peer-deps
```

Ou utilisez le script npm:
```powershell
npm run install:force
```

## Pourquoi?

- Le projet utilise React 19 (dernière version avec Next.js 16)
- La bibliothèque de drag & drop (@dnd-kit) est compatible React 19
- npm a des warnings sur les peer dependencies mais tout fonctionne correctement

## Après l'installation

```powershell
# Dev local
npm run dev

# Build
npm run build

# Production
npm start
```

## Alternative: Utiliser Docker (Recommandé)

Avec Docker, pas besoin d'installer les dépendances manuellement:

```powershell
# Depuis la racine du projet
docker-compose up -d frontend
```

Docker gère automatiquement les dépendances npm.
