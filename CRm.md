# Aetheria Internal OS - Technical Specification

## 1. Project Overview
**Goal:** Build a self-hosted, single-user internal ERP/CRM to replace Notion.
**Core User:** 1 Admin (me).
**Philosophy:** High performance, strictly typed, "Local-First" feel, containerized.

## 2. Tech Stack
- **Backend:** Python (FastAPI), Pydantic (V2), SQLAlchemy (Async), Alembic (Migrations).
- **Database:** PostgreSQL (latest).
- **Frontend:** Next.js 14+ (App Router), TypeScript, TailwindCSS.
- **UI Components:** Shadcn/ui (Radix).
- **State/Fetching:** TanStack Query (React Query).
- **Deployment:** Docker Compose (Service: api, db, frontend, proxy).

## 3. Data Architecture (PostgreSQL Schema)

### A. Clients (CRM & Prospection)
*Combines "Suivi Clients" and "Prospection" from screenshots.*
- `id`: UUID (PK)
- `company_name`: String (Required)
- `contact_person`: String (e.g., "Emilies Blaison")
- `status`: Enum ("Prospect", "Client", "Archive")
- `pipeline_stage`: Enum ("New", "Contacted", "Meeting Booked", "Dev", "Signed", "Delivered")
- `priority`: Enum ("Low", "Medium", "High")
- `sector`: String (Nullable)
- `company_size`: Enum ("TPE", "PME", "ETI", "GE")
- `phone`: String (Nullable)
- `email`: String (Nullable)
- `next_action_date`: DateTime (Nullable)
- `notes`: Text (Quick context)
- `created_at`: Timestamp

### B. Tasks (Kanban)
- `id`: UUID (PK)
- `title`: String
- `description`: Text (Markdown support)
- `status`: Enum ("Backlog", "Todo", "In Progress", "Validation", "Done") -> *Maps to Kanban Columns*
- `priority`: Enum ("Low", "Medium", "High")
- `due_date`: DateTime
- `client_id`: UUID (FK -> Clients, Nullable for internal tasks)
- `tags`: Array[String] (Optional)

### C. Finances (Expenses & Subscriptions)
*Combines "Abonnement" and "Investissement" logic.*
- `id`: UUID (PK)
- `name`: String (e.g., "ChatGPT Pro", "Server Hetzner")
- `type`: Enum ("Subscription", "One-off")
- `category`: Enum ("Software", "Hardware", "Service", "Office")
- `amount`: Decimal (10, 2)
- `currency`: String (Default "EUR")
- `billing_date`: Date (When it hits the bank)
- `renewal_date`: Date (Nullable, for Subscriptions)
- `is_paid`: Boolean
- `invoice_path`: String (Path to stored PDF on disk)

### D. Meeting Notes (CR)
- `id`: UUID (PK)
- `title`: String
- `date`: DateTime
- `content`: Text (Markdown body)
- `client_id`: UUID (FK -> Clients)
- `attachments`: Array[String] (File paths)

## 4. Feature Requirements

### Backend (FastAPI)
- **RESTful API:** Standard CRUD for all 4 entities.
- **File Upload:** Endpoint to upload PDFs (Invoices/CR), save to a Docker Volume (`/data/uploads`), return file path.
- **Aggregations:** Endpoint `/stats` for the dashboard (Total MRR, Total Expenses this month, Pending Tasks count).

### Frontend (Next.js)
1.  **Dashboard (Home):**
    - KPI Cards: Monthly Burn Rate (Expenses), Active Clients, Tasks Due Today.
    - Mini Lists: Next 3 RDV, Urgent Tasks.
2.  **CRM Page:**
    - Data Table (TanStack Table) with filters (Status, Priority).
    - Editable cells or Slide-over panel for details.
3.  **Tasks Page (Kanban):**
    - Drag and Drop interface (use `@hello-pangea/dnd` or similar).
    - Group by Status.
    - Visual tags for Priority.
4.  **Finance Page:**
    - List view of expenses.
    - Visual badge for "Subscription" vs "One-off".
    - "Upload Invoice" button on each row.

## 5. Security & Authentication (Critical)

### Backend Auth (JWT Implementation)
- **Standard:** OAuth2 with Password Flow (Bearer Token).
- **Libraries:** `python-jose` (for JWT encoding/decoding), `passlib[bcrypt]` (for password hashing), `python-multipart` (for login form).
- **Model:**
  - `User` table: `id`, `email` (unique), `hashed_password`, `is_active`, `role` (default "admin").
- **Endpoints:**
  - `POST /auth/token`: Validates credentials, returns `{ "access_token": "...", "token_type": "bearer" }`.
  - `GET /users/me`: Returns current user profile (protected dependency).
- **Protection:** All business routes (Clients, Tasks, Finance) must depend on `get_current_active_user`.
- **Seeding:** Create a script `seed_user.py` to insert the initial Admin user manually (since no public sign-up page is needed).

### Frontend Auth (Next.js)
- **Logic:**
  - Login Page (`/login`) with Email/Password form.
  - Store JWT in **HTTPOnly Cookie** (safest) or LocalStorage (acceptable for internal tool).
  - **Middleware:** Use Next.js Middleware (`middleware.ts`) to intercept requests. If no valid token/session exists, redirect all routes to `/login`.
  - **Axios/Fetch Interceptor:** Automatically attach `Authorization: Bearer <token>` to every backend request.
  - **Logout:** Button that clears the storage/cookie and redirects to login.

### Infrastructure Security
- **Docker:**
  - Database container must NOT expose ports to host (keep `5432` internal to the docker network). Only the FastAPI container talks to DB.
  - API container exposes port (e.g., `8000`) only to localhost or via a Reverse Proxy (Nginx/Caddy) with SSL (Let's Encrypt).

## 6. Development Instructions for Cursor
1.  Initialize the project structure (monorepo style: `/backend`, `/frontend`).
2.  Start with Backend: Models -> Schemas (Pydantic) -> CRUD -> Routes.
3.  Then Frontend: Setup Shadcn, create API client, build pages.
4.  Focus on the **Kanban** component robustness.