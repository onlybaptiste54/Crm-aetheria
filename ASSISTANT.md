# Assistant IA Aetheria — n8n + Discord (architecture routeur d'intention)

Un message Discord ne part PAS vers un gros agent fourre-tout à 9 outils.
Il passe d'abord par un **classifieur d'intention** (modèle léger, pas cher),
puis un **Switch** l'envoie vers la **branche spécialisée** : chaque branche a
son mini-agent, son mini-prompt et 2-4 outils max. Workflows courts, agents
précis, coûts maîtrisés.

```
Discord Trigger
   └─ IF (author.id == TON ID)          ← sécurité, non négociable
        └─ Text Classifier (Haiku)      ← détecte l'intention
             └─ Switch
                  ├─ brief_du_jour  → HTTP /today → LLM (mise en forme) → Discord
                  ├─ taches         → Agent Tâches   (3 outils)         → Discord
                  ├─ crm_clients    → Agent Clients  (3 outils)         → Discord
                  ├─ emails         → Agent Emails   (Gmail + 1 outil)  → Discord
                  └─ autre          → Agent Général  (0-1 outil)        → Discord
```

- **Classifieur** : nœud n8n "Text Classifier" avec `claude-haiku-4-5` (rapide, ~centimes).
- **Agents de branche** : `claude-sonnet-5`.
- **Mémoire de conversation** : nœud "Postgres Chat Memory" sur CHAQUE agent,
  avec **la même session key** (`{{ $json.author.id }}`) → la mémoire est
  partagée entre les branches, la conversation reste fluide même si deux
  messages consécutifs partent dans des branches différentes.
- **Mémoire longue** : le CRM lui-même (notes clients, tâches). Pas de base parallèle.
- **Auth CRM** : header `X-API-Key` (env `CRM_API_KEY` du backend). URL de base :
  `https://api-crm.agenceaetheria.com` (prod) / `http://backend:8000` (dev même réseau Docker).

---

## 1. Le classifieur (Text Classifier)

Les **descriptions de catégories** sont ce que lit le modèle : elles font tout le travail.

| Catégorie | Description à mettre dans n8n |
|---|---|
| `brief_du_jour` | L'utilisateur demande le point du jour, ses urgences, son programme, ses RDV du jour, "quoi de neuf", "fais le point". |
| `taches` | Créer, modifier, lister, terminer ou reporter des tâches ; questions d'échéances ou de kanban. Ex : "crée une tâche", "c'est quoi mes tâches en retard", "passe X en terminé". |
| `crm_clients` | Clients et prospects : lister, créer, mettre à jour, pipeline, prochaine action/RDV d'un client, ajouter une info/note sur un client. Ex : "ajoute le prospect X", "où en est le client Y", "note que Z préfère le mardi". |
| `emails` | Boîte mail : chercher, lire, résumer des emails ; rédiger un brouillon. Ex : "j'ai reçu quoi de X", "résume les mails d'aujourd'hui". |
| `autre` | Tout le reste : discussion générale, questions hors CRM/emails. (Catégorie fallback.) |

Réglage : une seule catégorie par message (v1). Si un message mélange deux
intentions, le classifieur prend la dominante et l'agent signale le reste
("je t'ai créé la tâche ; redis-moi pour les mails").

---

## 2. Socle commun de prompt (à coller EN TÊTE de chaque agent)

```
Tu es Aether, l'assistant de Baptiste (agence Aetheria), sur Discord.
Règles absolues :
1. Ne réponds jamais de mémoire sur les données : appelle toujours un outil,
   seule l'API fait foi.
2. Avant toute création/modification : reformule l'action en une phrase et
   attends un "oui" explicite. Une confirmation = une action.
3. Ne devine jamais un ID : lis d'abord via un outil de lecture.
4. Si un outil échoue, dis-le simplement, n'invente jamais un résultat.
5. Dates en français (JJ/MM), fuseau Europe/Paris. "demain"/"lundi" →
   convertis en date exacte et confirme-la avant d'écrire.
6. Style Discord : court, listes à puces, pas de pavés. Tutoie Baptiste.
7. Tu ne sers que Baptiste. Hors périmètre → refuse poliment.
```

## 3. Les branches

### Branche `brief_du_jour` (pas d'agent — la plus simple)
1. **HTTP Request** : GET `/today` (header X-API-Key)
2. **LLM Chain** (Sonnet) avec pour instruction :
   ```
   Transforme ce JSON en point du jour Discord : max 10 lignes,
   ⚠️ pour le retard, urgences d'abord, dates JJ/MM, ton direct, tutoiement.
   Si tout est vide : "Rien d'urgent aujourd'hui" + une suggestion utile.
   ```
3. **Discord** : envoi.

### Branche `taches` — Agent Tâches
Prompt spécifique (après le socle) :
```
Ton domaine : les tâches (kanban Backlog/Todo/In Progress/Validation/Done).
Pour lier une tâche à un client, retrouve son client_id via find_clients.
Une tâche a : title, priority (Low/Medium/High), due_date, status, client_id.
```
| Outil | Route | Description n8n |
|---|---|---|
| `list_tasks` | GET `/tasks` | Liste toutes les tâches avec id, titre, statut, priorité, échéance, client_id. |
| `create_task` | POST `/tasks` | Crée une tâche. Body JSON : title requis ; priority, due_date (ISO), status, client_id, description optionnels. Confirmer avant d'appeler. |
| `update_task` | PUT `/tasks/{id}` | Modifie une tâche (statut, échéance, priorité...). ID obtenu via list_tasks. |
| `find_clients` | GET `/clients` | Pour retrouver le client_id d'un client par son nom. |

### Branche `crm_clients` — Agent Clients
Prompt spécifique :
```
Ton domaine : clients et prospects (status Prospect/Client/Archive,
pipeline New→Contacted→Meeting Booked→Dev→Signed→Delivered).
Mémoire longue : un fait durable sur un client → propose de l'ajouter à ses
notes ; récupère les notes actuelles et AJOUTE une ligne datée à la fin,
n'écrase jamais. Un RDV/relance → mets à jour next_action_date.
Une action à faire → propose plutôt une tâche (branche tâches).
```
| Outil | Route | Description n8n |
|---|---|---|
| `list_clients` | GET `/clients` | Liste clients et prospects : id, company_name, status, pipeline_stage, next_action_date, notes, contact. |
| `create_client` | POST `/clients` | Crée un client/prospect. Body : company_name requis ; status, contact_person, email, phone, sector, pipeline_stage, priority, next_action_date, notes optionnels. Confirmer avant. |
| `update_client` | PUT `/clients/{id}` | Met à jour un client : notes (ajouter, pas écraser), next_action_date, pipeline_stage... ID via list_clients. |

### Branche `emails` — Agent Emails
Prompt spécifique :
```
Ton domaine : la boîte Gmail de Baptiste.
Croise avec le CRM : expéditeur connu → dis de quel client il s'agit et où
il en est (find_clients). Tu ne rédiges un email QUE sur demande explicite,
et tu montres le brouillon avant tout envoi.
```
| Outil | Type | Description |
|---|---|---|
| Gmail Tool | nœud Gmail n8n (OAuth `agenceaetheria@gmail.com`) | Recherche/lecture d'emails. |
| `find_clients` | GET `/clients` | Croiser un expéditeur avec le CRM. |

### Branche `autre` — Agent Général
Socle commun seul, sans outil (ou `get_today` en lecture si utile).
Répond, discute, et si la demande relève en fait du CRM/emails, invite à
reformuler ("demande-moi direct : crée une tâche...").

---

## 4. Mémoire

- **Postgres Chat Memory** sur chaque agent, session key identique :
  `{{ $json.author.id }}`. Credentials vers le Postgres du serveur
  (n8n crée sa table tout seul). → conversation partagée entre branches.
- **Mémoire longue = le CRM** : notes clients datées + tâches. Visible et
  corrigeable dans l'UI, pas de base parallèle qui diverge.

## 5. Setup

- `CRM_API_KEY` : dans le `.env`/`.env.prod` du CRM (déjà supporté backend)
  ET en credential n8n (jamais en dur dans les nœuds).
- Bot Discord : discord.com/developers → application → bot → token dans le
  credential Discord n8n → inviter le bot sur ton serveur (lecture/écriture messages).
- Récupérer ton ID Discord (mode développeur → clic droit → copier l'ID)
  pour le nœud IF.

## 6. Phase 2 (quand le besoin est réel)

- **RAG pgvector** sur comptes-rendus + emails archivés pour les questions
  "historiques" (image `pgvector/pgvector:pg16` en dev, `CREATE EXTENSION
  vector` sur le Postgres serveur en prod) — nouvelle branche `historique`
  dans le Switch.
- **Brief automatique 8h** : workflow séparé Schedule Trigger → réutilise la
  branche brief → Discord. Aucune IA de plus à câbler.
- Multi-intentions par message (classifieur multi-label) si le besoin se sent.
