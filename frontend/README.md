# Aetheria OS - Frontend

Frontend Next.js 14 pour l'application CRM/ERP interne Aetheria.

## 🛠️ Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS 4
- **UI Components**: Shadcn/ui (Radix UI)
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **HTTP Client**: Axios
- **Drag & Drop**: @hello-pangea/dnd

## 📁 Structure

```
frontend/
├── app/
│   ├── (dashboard)/        # Routes protégées avec layout
│   │   ├── page.tsx        # Dashboard
│   │   ├── clients/        # Page CRM
│   │   ├── tasks/          # Page Kanban
│   │   ├── finances/       # Page Finances
│   │   └── meeting-notes/  # Page CR
│   ├── login/              # Page de connexion
│   ├── layout.tsx          # Root layout
│   └── globals.css         # Styles globaux
├── components/
│   ├── ui/                 # Composants Shadcn/ui
│   ├── sidebar.tsx         # Navigation
│   ├── auth-guard.tsx      # Protection des routes
│   └── providers.tsx       # React Query Provider
├── lib/
│   ├── api.ts              # Client API & types
│   ├── auth-store.ts       # Store Zustand pour l'auth
│   └── utils.ts            # Utilitaires
└── middleware.ts           # Middleware Next.js
```

## 🚀 Démarrage

### 1. Installation des dépendances

```bash
cd frontend
npm install
```

### 2. Configuration

Le fichier `.env.local` est déjà créé avec:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 3. Lancement en dev

```bash
npm run dev
```

L'app sera accessible sur **http://localhost:3000**

### 4. Build pour production

```bash
npm run build
npm start
```

## 🔐 Authentification

### Flow
1. Page de login (`/login`)
2. Login via API → récupération du JWT
3. Token stocké dans localStorage + Zustand store
4. Interceptor Axios ajoute le token à chaque requête
5. AuthGuard protège les routes du dashboard
6. Auto-redirect vers `/login` si token invalide

### Credentials par défaut
- **Email**: `admin@aetheria.local`
- **Password**: `admin123`

## 📊 Pages

### Dashboard (`/`)
- KPI Cards (MRR, Dépenses, Clients Actifs, Tâches)
- Liste des prochains RDV
- Tâches urgentes

### Clients (`/clients`)
- Data Table avec recherche et filtres
- Gestion complète des clients
- Badges de statut et priorité

### Tasks (`/tasks`)
- Kanban Board (5 colonnes)
- Drag & Drop entre les colonnes
- Filtrage par priorité et tags

### Finances (`/finances`)
- Liste des dépenses et abonnements
- Filtres par type (Subscription / One-off)
- Upload de factures
- Calcul MRR automatique

### Meeting Notes (`/meeting-notes`)
- Liste des comptes-rendus
- Association client
- Pièces jointes

## 🎨 Composants Shadcn/ui

Composants créés:
- `Button`
- `Card`
- `Input`
- `Label`
- `Badge`

Pour en ajouter d'autres, suivre la doc: https://ui.shadcn.com/

## 🔄 TanStack Query

Hooks utilisés partout:
- `useQuery` pour fetch les données
- `useMutation` pour les create/update/delete
- Invalidation automatique des queries après mutations

Exemple:
```tsx
const { data: clients, isLoading } = useQuery({
  queryKey: ["clients"],
  queryFn: () => clientsApi.getAll(),
})
```

## 🎯 Prochaines Fonctionnalités

- [ ] Formulaires de création/édition (modals)
- [ ] Pagination sur les tables
- [ ] Tri avancé des colonnes
- [ ] Upload de fichiers avec preview
- [ ] Mode sombre
- [ ] Notifications toast
- [ ] Filtres avancés sur toutes les pages
- [ ] Export Excel/CSV
- [ ] Graphiques avec Recharts

## 🐛 Debug

### React Query Devtools
Les devtools sont activés en dev. Appuyez sur l'icône en bas à gauche pour voir l'état des queries.

### Logs API
Tous les appels API passent par Axios avec interceptors. Vérifiez la console pour les erreurs.

## 📝 Notes

- **Architecture simple**: Pas de sur-ingénierie, code flat et maintenable
- **Mono-utilisateur**: Pas besoin de gestion complexe des permissions
- **Local-First**: Optimisé pour une utilisation locale rapide

---

**Développé pour Aetheria OS** 🚀
