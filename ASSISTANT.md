# Assistant IA Aetheria — Aether

Assistant exécutif de Baptiste (agence Aetheria). Un seul **orchestrateur** IA,
ses capacités exposées via **MCP** (réutilisables partout), mémoire séparée.
Interface : **Telegram** (trigger natif n8n). Réutilisable dans Claude Desktop.

## Les 3 couches (à ne jamais confondre)

```
🧠 CERVEAU      = l'orchestrateur LLM (Claude Sonnet) — il raisonne, il enchaîne
💾 MÉMOIRE      = Postgres Chat Memory (court terme) + le CRM (long terme)
🖐️ MAINS/YEUX   = MCP : serveur MCP CRM + Gmail — les outils qu'il peut appeler
```

MCP n'a PAS de mémoire (sans état, par design) et n'est PAS le cerveau : c'est
juste le catalogue d'outils. La mémoire et le raisonnement vivent ailleurs.

## Schéma

```
Telegram Trigger
  └─ IF (chat.id == TON ID)                 ← sécurité, non négociable
       └─ AI Agent "Aether" (Sonnet)
            ├─ Memory : Postgres Chat Memory (session = chat.id)
            ├─ Tool   : MCP Client → serveur MCP CRM   (tâches, clients, projets, /today)
            └─ Tool   : Gmail (MCP Gmail OU nœud n8n natif)
       └─ Telegram Send Message
```

Un seul agent, deux sources d'outils (CRM via MCP, Gmail). L'agent lit les
**descriptions** des outils MCP pour choisir — donc les descriptions dans le
serveur MCP font tout le travail de routage (plus besoin de classifieur/switch).

---

## 1. Le serveur MCP CRM (la seule brique à coder)

Petit service à côté du backend : il **enveloppe l'API REST existante** (auth
`X-API-Key`) et l'expose en outils MCP. Transport **HTTP/SSE** pour être
joignable à la fois par n8n ET par Claude Desktop (connecteur MCP distant).
Nouveau conteneur dans le docker-compose, derrière Traefik
(ex : `mcp-crm.agenceaetheria.com`), protégé par un secret.

Outils à exposer (chacun = 1 appel à l'API déjà en place) :

| Outil MCP | API sous-jacente | Rôle |
|---|---|---|
| `get_today` | GET `/today` | Point du jour : retards, dus aujourd'hui, prochaines actions clients, renouvellements 7j. |
| `list_tasks` | GET `/tasks` | Lister les tâches (id, titre, statut, priorité, échéance, client). |
| `create_task` | POST `/tasks` | Créer une tâche (title requis ; priority, due_date, status, client_id, description). |
| `update_task` | PUT `/tasks/{id}` | Modifier une tâche (statut, échéance, priorité...). |
| `list_clients` | GET `/clients` | Lister clients/prospects (statut, pipeline, next_action, notes, contact, email). |
| `create_client` | POST `/clients` | Créer un client/prospect (company_name requis + champs optionnels). |
| `update_client` | PUT `/clients/{id}` | Mettre à jour : notes (ajouter, pas écraser), next_action_date, pipeline. |
| `list_projects` | GET `/projects` | Lister les projets (filtre `client_id` possible). |
| `list_meeting_notes` | GET `/meeting-notes` | Lister les comptes-rendus. |
| `search_crm` | (à ajouter) GET `/search?q=` | Recherche transverse clients+tâches+notes+projets (phase 2). |

Chaque outil a une **description claire** (une phrase + les params) : c'est ce
que lit l'agent pour décider. Les descriptions comptent plus que le code.

**Sécurité serveur (non délégable au LLM) :** variable `ASSISTANT_WRITE_ENABLED`
sur le CRM/serveur MCP. Tant qu'elle est à `false`, les outils d'écriture
(`create_*`, `update_*`) refusent — même si l'agent essaie. Kill-switch réel :
on démarre à `false` (lecture seule), on passe à `true` quand la lecture est
rodée.

## 2. Gmail

Deux options, au choix :
- **Serveur MCP Gmail** (il en existe des prêts à l'emploi) → cohérent, tout en MCP.
- **Nœud Gmail n8n natif** en tool de l'agent → plus simple à câbler dans n8n (OAuth intégré).

Recommandation : **nœud n8n natif au début** (OAuth géré par n8n, moins de setup),
on bascule en MCP Gmail seulement si tu veux les emails aussi dans Claude Desktop.

Capacités : chercher/lire, créer un **brouillon** (défaut), **envoyer**
(uniquement sur demande explicite + confirmation du mail complet). Adresse
jamais devinée : prise dans le CRM (`list_clients`) ou dans le fil.

## 3. Mémoire

- **Court terme (conversation)** : nœud **Postgres Chat Memory**, session key =
  `{{ $json.message.chat.id }}`, sur le Postgres du serveur (crée sa table seul).
  → l'agent se souvient du fil, y compris des **actions en attente de
  confirmation** (voir §4).
- **Long terme (faits durables)** : **le CRM**. Un fait sur un client → notes du
  client (ligne datée ajoutée à la fin, jamais d'écrasement). Une action → une tâche.
  Pas de base parallèle qui diverge : sa mémoire = ta base, visible dans l'UI.

## 4. Confirmations (c'est un problème d'ÉTAT, pas de prompt)

"Je crée la tâche X, ok ?" puis toi "oui" au message suivant → l'action proposée
doit persister dans la mémoire de conversation entre les deux tours. L'agent :
1. décrit l'action précise, la garde en tête (mémoire), demande confirmation ;
2. au "oui", exécute **exactement** l'action mémorisée ; une confirmation = une action ;
3. si tu changes de sujet entre-temps, l'action en attente est abandonnée.

## 5. Prompt de l'orchestrateur (System Message)

```
Tu es Aether, l'assistant exécutif de Baptiste, fondateur de l'agence Aetheria.
Tu es branché sur son CRM (clients, prospects, tâches, projets, comptes-rendus,
finances) via des outils, et sur sa boîte Gmail. Tu lui parles sur Telegram.

Capacités : comprendre des demandes multi-étapes, choisir les bons outils,
enchaîner plusieurs actions, et répondre court.

Règles absolues :
1. Ne réponds JAMAIS de mémoire sur CRM/tâches/emails : appelle toujours un
   outil, seule l'API fait foi. Pour un point du jour : get_today d'abord.
2. Avant toute création / modification / envoi : reformule l'action en une
   phrase et attends un "oui" explicite. Une confirmation = une seule action.
3. Ne devine jamais un ID, une date ni une adresse email : récupère-les via un
   outil de lecture, ou demande.
4. Si une demande contient plusieurs actions, traite-les dans l'ordre logique
   et confirme celles qui écrivent.
5. Mémoire longue = le CRM : un fait durable sur un client → propose de
   l'ajouter à ses notes (ajouter une ligne datée, ne jamais écraser).
   Une action à faire → propose une tâche.
6. Emails : brouillon par défaut ; envoi direct seulement si Baptiste dit
   explicitement "envoie", après lui avoir montré le mail complet.
7. Si un outil échoue, dis-le simplement, n'invente jamais un résultat.
8. Dates en français (JJ/MM), fuseau Europe/Paris ; "demain"/"lundi" →
   convertis en date exacte et confirme-la avant d'écrire.
9. Style Telegram : court, listes à puces, pas de pavés. Tutoie Baptiste.
10. Tu ne sers que Baptiste. Hors périmètre (CRM, emails, orga) → refuse poliment.
```

## 6. Réutilisation (l'intérêt du MCP)

Le **même serveur MCP CRM** se branche aussi dans **Claude Desktop** (Réglages →
Connecteurs → serveur MCP distant + le secret). Tu obtiens le même assistant au
bureau, sans rien recâbler. Les outils sont définis une fois, consommés partout.

## 7. Sécurité (récap)

- Telegram : nœud **IF** sur ton chat.id — l'agent ne répond qu'à toi.
- Auth CRM : `X-API-Key` (jamais en dur : credential n8n / secret MCP).
- Écritures : `ASSISTANT_WRITE_ENABLED` côté serveur (démarrer en lecture seule).
- Emails : brouillon par défaut, adresse jamais devinée, envoi sur confirmation.
- Traçabilité : logs d'exécution n8n (+ Langfuse auto-hébergé si ça se complexifie).

## 8. Setup (ordre conseillé)

1. **Bot Telegram** : @BotFather → `/newbot` → token. Récupère ton chat.id
   (envoie un message au bot, lis-le via l'API getUpdates ou un nœud n8n).
2. **`CRM_API_KEY`** dans `.env`/`.env.prod` du CRM (déjà supporté backend).
3. **Serveur MCP CRM** : le construire (wrapper API), le déployer (conteneur +
   Traefik + secret), `ASSISTANT_WRITE_ENABLED=false` au départ.
4. **n8n** : Telegram Trigger → IF (chat.id) → AI Agent (Sonnet, prompt ci-dessus,
   Postgres Chat Memory, MCP Client Tool → serveur MCP CRM, + Gmail) → Telegram Send.
5. Tester en **lecture** ("fais le point", "mes tâches", "mails de X").
6. Passer `ASSISTANT_WRITE_ENABLED=true` → tester créations avec confirmation.
7. Brancher le **même serveur MCP dans Claude Desktop** (bonus bureau).

## 9. Phase 2 (quand le besoin est réel)

- **RAG pgvector** sur comptes-rendus + emails archivés (questions historiques) →
  nouvel outil MCP `search_semantic`. Image `pgvector/pgvector:pg16` en dev,
  `CREATE EXTENSION vector` en prod.
- **Brief auto 8h** : workflow n8n séparé, Schedule Trigger → get_today →
  mise en forme → Telegram. Zéro IA de plus.
- **Endpoint `/search`** côté CRM (plein-texte simple) avant de sortir les vecteurs :
  souvent suffisant.
