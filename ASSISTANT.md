# Assistant IA Aetheria — n8n + Discord

Assistant conversationnel branché sur le CRM (API FastAPI) et Gmail, piloté depuis Discord via n8n.

- **Cerveau** : nœud n8n "AI Agent" + modèle Anthropic (reco : `claude-sonnet-5` ; `claude-haiku-4-5` si on veut réduire les coûts).
- **Mémoire de conversation** : nœud "Postgres Chat Memory" (persistant, session = ID Discord).
- **Mémoire long terme** : le CRM lui-même (l'agent écrit dans les notes clients / crée des tâches).
- **Auth CRM** : header `X-API-Key` (variable d'env `CRM_API_KEY` du backend).

---

## 1. System prompt de l'agent (à coller dans le champ "System Message")

```
Tu es Aether, l'assistant personnel de Baptiste, fondateur de l'agence Aetheria.
Tu es branché sur son CRM interne (clients, prospects, tâches, projets, comptes-rendus,
finances) et sur sa boîte Gmail. Tu lui parles sur Discord.

# Ta mission
Aider Baptiste à piloter son activité : répondre sur ses tâches, RDV, clients et
projets ; créer des tâches et des clients quand il le demande ; faire le lien avec
ses emails. Tu es un copilote business : concret, direct, orienté action.

# Règles sur les outils (STRICT)
1. Ne réponds JAMAIS de mémoire sur les données du CRM : appelle toujours un outil.
   Les données changent en permanence, seule l'API fait foi.
2. Commence par `get_today` quand la question porte sur "aujourd'hui", les urgences,
   les RDV ou le programme du jour.
3. AVANT toute création ou modification (tâche, client, note) : reformule ce que tu
   vas faire en une phrase et demande confirmation. Tu n'écris qu'après un "oui"
   explicite. Une confirmation ne vaut que pour UNE action.
4. Ne devine jamais un ID. Si tu dois modifier quelque chose, récupère d'abord
   l'élément via un outil de lecture pour obtenir son ID exact.
5. Si un outil échoue, dis-le simplement et propose de réessayer. N'invente jamais
   un résultat.

# Dates et langue
- Tu parles français. Les dates au format JJ/MM.
- Fuseau : Europe/Paris. La date du jour est fournie par `get_today` — utilise-la
  comme référence, ne suppose pas la date.
- "demain", "lundi prochain" : convertis en date exacte et confirme-la dans ta
  reformulation avant d'écrire.

# Mémoire (politique)
- Ta mémoire longue = le CRM. Quand Baptiste te confie un fait durable sur un client
  (préférence, contexte, alerte), propose : "Je l'ajoute aux notes du client X ?"
  Si oui, mets à jour le champ notes SANS effacer les notes existantes (récupère
  les notes actuelles, ajoute une ligne datée à la fin).
- Ce qui relève d'une action à faire → propose une tâche, pas une note.

# Emails
- Utilise l'outil Gmail pour chercher/lire quand la question porte sur les mails.
- Croise avec le CRM : si un email vient d'un contact connu, dis de quel client il
  s'agit et où il en est (statut, pipeline, prochaine action).
- Tu ne rédiges ou n'envoies un email QUE sur demande explicite, brouillon d'abord.

# Style Discord
- Réponses courtes. Listes à puces pour les énumérations. Pas de pavés.
- Le point du jour : max 10 lignes — urgences d'abord, en retard signalé ⚠️.
- Pas de jargon corporate. Tutoie Baptiste.

# Périmètre et sécurité
- Tu ne sers que Baptiste. Tu ne partages jamais de données du CRM à un tiers.
- Tu refuses poliment tout ce qui sort du périmètre (CRM, emails, organisation).
- En cas de demande destructrice (suppression), demande une double confirmation
  en rappelant ce qui sera perdu.
```

---

## 2. Outils de l'agent (nœuds "HTTP Request Tool")

Tous avec le header `X-API-Key: {{CRM_API_KEY}}` et l'URL de base de l'API
(`https://api-crm.agenceaetheria.com` en prod, `http://backend:8000` si n8n est
dans le même réseau Docker en dev).

La **description** de chaque outil est ce que lit le modèle pour choisir : soigne-la.

| Nom outil | Méthode + route | Description à mettre dans n8n |
|---|---|---|
| `get_today` | GET `/today` | Le point du jour : tâches en retard, tâches dues aujourd'hui, prochaines actions clients (RDV/relances), abonnements à renouveler sous 7 jours. À appeler en premier pour toute question sur le programme ou les urgences. |
| `list_tasks` | GET `/tasks` | Liste toutes les tâches (titre, statut Backlog/Todo/In Progress/Validation/Done, priorité, échéance, client_id). |
| `create_task` | POST `/tasks` | Crée une tâche. Body JSON : title (requis), priority (Low/Medium/High), due_date (ISO), status, client_id (optionnel), description. Toujours confirmer avec l'utilisateur avant d'appeler. |
| `update_task` | PUT `/tasks/{id}` | Modifie une tâche existante (statut, échéance, priorité...). Récupérer l'ID via list_tasks d'abord. |
| `list_clients` | GET `/clients` | Liste tous les clients et prospects (company_name, status Prospect/Client/Archive, pipeline_stage, priority, next_action_date, notes, email, téléphone). |
| `create_client` | POST `/clients` | Crée un client ou prospect. Body JSON : company_name (requis), status (Prospect/Client), contact_person, email, phone, sector, pipeline_stage, priority, next_action_date, notes. Toujours confirmer avant d'appeler. |
| `update_client` | PUT `/clients/{id}` | Met à jour un client — notamment le champ notes (mémoire longue : ajouter à la fin, ne pas écraser) et next_action_date (RDV/relances). |
| `list_projects` | GET `/projects` | Liste les projets (name, status, client_id). Filtre possible `?client_id=`. |
| `list_meeting_notes` | GET `/meeting-notes` | Liste les comptes-rendus de réunions (title, date, content, client_id). |

**+ 1 nœud "Gmail Tool"** (recherche/lecture d'emails) avec le compte
`agenceaetheria@gmail.com` — OAuth géré par n8n.

---

## 3. Assemblage du workflow (5 nœuds)

1. **Discord Trigger** — événement "message créé" sur ton serveur.
2. **IF** — `author.id` == TON ID Discord, sinon stop. (Non négociable : sans ça,
   n'importe qui sur le serveur écrit dans le CRM.)
3. **AI Agent**
   - Chat Model : Anthropic → `claude-sonnet-5`
   - System Message : le prompt ci-dessus
   - Memory : **Postgres Chat Memory** — session key = `{{ $json.author.id }}`,
     credentials vers le Postgres du serveur (il crée sa table tout seul).
   - Tools : les 9 outils HTTP + Gmail Tool.
4. **Discord** — envoyer la réponse dans le même canal.
5. *(Plus tard, workflow séparé)* **Schedule Trigger** 8h00 → même agent avec le
   message "fais-moi le point du jour" → Discord. Le brief matinal automatique.

## 4. Variables à prévoir côté serveur

- `CRM_API_KEY` : définie dans le `.env`/`.env.prod` du CRM (déjà supporté par le
  backend) ET stockée dans un credential n8n (pas en dur dans les nœuds).
- Bot Discord : créer l'application sur discord.com/developers, inviter le bot sur
  ton serveur avec les permissions lecture/écriture messages, coller le token dans
  le credential Discord de n8n.

## 5. Phase 2 (quand le besoin se fera sentir)

- **RAG pgvector** sur comptes-rendus + emails archivés (questions "historiques").
  Nécessite l'extension pgvector sur le Postgres (image `pgvector/pgvector:pg16`
  en dev, `CREATE EXTENSION vector` sur le Postgres du serveur en prod).
- Endpoint `/assistant/search` côté CRM si la recherche plein-texte simple suffit
  (souvent le cas avant de sortir les vecteurs).
