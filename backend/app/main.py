"""FastAPI Main App - Routes CRUD directes, pas de routers séparés."""
import os
import shutil
from datetime import timedelta, datetime
from uuid import UUID
from pathlib import Path
from typing import List

from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Query
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text

from .database import get_db, engine, Base
from .auth import (
    authenticate_user,
    create_access_token,
    get_current_active_user,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)
from .models import (
    User, Client, Task, Finance, MeetingNote, Project, Document,
    TaskStatus, ClientStatus, FinanceType,
)
from .schemas import (
    Token,
    UserOut,
    ClientCreate,
    ClientUpdate,
    ClientOut,
    TaskCreate,
    TaskUpdate,
    TaskOut,
    FinanceCreate,
    FinanceUpdate,
    FinanceOut,
    MeetingNoteCreate,
    MeetingNoteUpdate,
    MeetingNoteOut,
    ProjectCreate,
    ProjectUpdate,
    ProjectOut,
    DocumentOut,
    DashboardStats,
)
from .services.dashboard_stats import build_dashboard_stats

# ========== APP CONFIG ==========
app = FastAPI(
    title="Aetheria Internal OS API",
    description="Backend FastAPI pour CRM/ERP interne",
    version="1.0.0",
)

# CORS
_cors_origins = [
    "http://localhost:3000",
    "https://crm.agenceaetheria.com",
]
if os.getenv("CORS_ORIGINS"):
    _cors_origins.extend(o.strip() for o in os.getenv("CORS_ORIGINS").split(",") if o.strip())
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Upload directory
UPLOAD_DIR = Path("/app/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

import re


def safe_filename(name: str | None) -> str:
    """Nettoie un nom de fichier fourni par l'utilisateur (anti path traversal)."""
    base = os.path.basename(name or "").strip()
    base = re.sub(r"[^A-Za-z0-9._-]", "_", base)
    base = base.lstrip(".") or "file"
    return base[:200]


# Runtime schema patching for environments that do not run migrations.
async def apply_runtime_migrations() -> None:
    async with engine.begin() as conn:
        await conn.execute(
            text("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC(10,2)")
        )
        await conn.execute(
            text("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS actual_hours NUMERIC(10,2)")
        )


# ========== STARTUP EVENT ==========
@app.on_event("startup")
async def startup_event():
    """Create tables on startup (pour dev, en prod utiliser Alembic)."""
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        await apply_runtime_migrations()
    except Exception as e:
        # Ignorer l'erreur si les types existent déjà (pb connu avec asyncpg + sqlalchemy enum)
        if "duplicate key value violates unique constraint" in str(e):
            print(f"Startup Warning: Database types likely already exist. Ignoring. Details: {e}")
        else:
            raise e


# ========== ROOT ==========
@app.get("/")
async def root():
    return {"message": "Aetheria Internal OS API - Running"}


# ========== AUTH ROUTES ==========
@app.post("/auth/token", response_model=Token, tags=["Auth"])
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    """Login endpoint - Retourne un JWT token."""
    user = await authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/users/me", response_model=UserOut, tags=["Auth"])
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    """Retourne le profil du user courant."""
    return current_user


# ========== CLIENTS CRUD ==========
@app.get("/clients", response_model=List[ClientOut], tags=["Clients"])
async def get_clients(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Liste tous les clients."""
    result = await db.execute(select(Client).offset(skip).limit(limit))
    clients = result.scalars().all()
    return clients


@app.get("/clients/{client_id}", response_model=ClientOut, tags=["Clients"])
async def get_client(
    client_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Récupère un client par ID."""
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client


@app.post("/clients", response_model=ClientOut, status_code=status.HTTP_201_CREATED, tags=["Clients"])
async def create_client(
    client_data: ClientCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Crée un nouveau client."""
    client = Client(**client_data.model_dump())
    db.add(client)
    await db.commit()
    await db.refresh(client)
    return client


@app.put("/clients/{client_id}", response_model=ClientOut, tags=["Clients"])
async def update_client(
    client_id: UUID,
    client_data: ClientUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Met à jour un client."""
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Update fields
    for key, value in client_data.model_dump(exclude_unset=True).items():
        setattr(client, key, value)
    
    await db.commit()
    await db.refresh(client)
    return client


@app.delete("/clients/{client_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Clients"])
async def delete_client(
    client_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Supprime un client."""
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    await db.delete(client)
    await db.commit()
    return None


# ========== TASKS CRUD ==========
@app.get("/tasks", response_model=List[TaskOut], tags=["Tasks"])
async def get_tasks(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Liste toutes les tâches."""
    result = await db.execute(select(Task).offset(skip).limit(limit))
    tasks = result.scalars().all()
    return tasks


@app.get("/tasks/{task_id}", response_model=TaskOut, tags=["Tasks"])
async def get_task(
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Récupère une tâche par ID."""
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@app.post("/tasks", response_model=TaskOut, status_code=status.HTTP_201_CREATED, tags=["Tasks"])
async def create_task(
    task_data: TaskCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Crée une nouvelle tâche."""
    task = Task(**task_data.model_dump())
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return task


@app.put("/tasks/{task_id}", response_model=TaskOut, tags=["Tasks"])
async def update_task(
    task_id: UUID,
    task_data: TaskUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Met à jour une tâche."""
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    for key, value in task_data.model_dump(exclude_unset=True).items():
        setattr(task, key, value)
    
    await db.commit()
    await db.refresh(task)
    return task


@app.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Tasks"])
async def delete_task(
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Supprime une tâche."""
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    await db.delete(task)
    await db.commit()
    return None


# ========== FINANCES CRUD ==========
@app.get("/finances", response_model=List[FinanceOut], tags=["Finances"])
async def get_finances(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Liste toutes les finances."""
    result = await db.execute(select(Finance).offset(skip).limit(limit))
    finances = result.scalars().all()
    return finances


@app.get("/finances/{finance_id}", response_model=FinanceOut, tags=["Finances"])
async def get_finance(
    finance_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Récupère une finance par ID."""
    result = await db.execute(select(Finance).where(Finance.id == finance_id))
    finance = result.scalar_one_or_none()
    if not finance:
        raise HTTPException(status_code=404, detail="Finance not found")
    return finance


@app.post("/finances", response_model=FinanceOut, status_code=status.HTTP_201_CREATED, tags=["Finances"])
async def create_finance(
    finance_data: FinanceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Crée une nouvelle entrée finance."""
    finance = Finance(**finance_data.model_dump())
    db.add(finance)
    await db.commit()
    await db.refresh(finance)
    return finance


@app.put("/finances/{finance_id}", response_model=FinanceOut, tags=["Finances"])
async def update_finance(
    finance_id: UUID,
    finance_data: FinanceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Met à jour une finance."""
    result = await db.execute(select(Finance).where(Finance.id == finance_id))
    finance = result.scalar_one_or_none()
    if not finance:
        raise HTTPException(status_code=404, detail="Finance not found")
    
    for key, value in finance_data.model_dump(exclude_unset=True).items():
        setattr(finance, key, value)
    
    await db.commit()
    await db.refresh(finance)
    return finance


@app.delete("/finances/{finance_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Finances"])
async def delete_finance(
    finance_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Supprime une finance."""
    result = await db.execute(select(Finance).where(Finance.id == finance_id))
    finance = result.scalar_one_or_none()
    if not finance:
        raise HTTPException(status_code=404, detail="Finance not found")
    
    await db.delete(finance)
    await db.commit()
    return None


# ========== MEETING NOTES CRUD ==========
@app.get("/meeting-notes", response_model=List[MeetingNoteOut], tags=["Meeting Notes"])
async def get_meeting_notes(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Liste toutes les notes de meeting."""
    result = await db.execute(select(MeetingNote).offset(skip).limit(limit))
    notes = result.scalars().all()
    return notes


@app.get("/meeting-notes/{note_id}", response_model=MeetingNoteOut, tags=["Meeting Notes"])
async def get_meeting_note(
    note_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Récupère une note par ID."""
    result = await db.execute(select(MeetingNote).where(MeetingNote.id == note_id))
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Meeting note not found")
    return note


@app.post("/meeting-notes", response_model=MeetingNoteOut, status_code=status.HTTP_201_CREATED, tags=["Meeting Notes"])
async def create_meeting_note(
    note_data: MeetingNoteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Crée une nouvelle note de meeting."""
    note = MeetingNote(**note_data.model_dump())
    db.add(note)
    await db.commit()
    await db.refresh(note)
    return note


@app.put("/meeting-notes/{note_id}", response_model=MeetingNoteOut, tags=["Meeting Notes"])
async def update_meeting_note(
    note_id: UUID,
    note_data: MeetingNoteUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Met à jour une note."""
    result = await db.execute(select(MeetingNote).where(MeetingNote.id == note_id))
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Meeting note not found")
    
    for key, value in note_data.model_dump(exclude_unset=True).items():
        setattr(note, key, value)
    
    await db.commit()
    await db.refresh(note)
    return note


@app.delete("/meeting-notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Meeting Notes"])
async def delete_meeting_note(
    note_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Supprime une note."""
    result = await db.execute(select(MeetingNote).where(MeetingNote.id == note_id))
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Meeting note not found")
    
    await db.delete(note)
    await db.commit()
    return None


# ========== PROJECTS CRUD ==========
@app.get("/projects", response_model=List[ProjectOut], tags=["Projects"])
async def get_projects(
    client_id: Optional[UUID] = Query(default=None),
    skip: int = 0,
    limit: int = 200,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Liste les projets, optionnellement filtrés par client."""
    query = select(Project)
    if client_id is not None:
        query = query.where(Project.client_id == client_id)
    result = await db.execute(query.offset(skip).limit(limit))
    return result.scalars().all()


@app.post("/projects", response_model=ProjectOut, status_code=status.HTTP_201_CREATED, tags=["Projects"])
async def create_project(
    project_data: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Crée un nouveau projet."""
    project = Project(**project_data.model_dump())
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project


@app.put("/projects/{project_id}", response_model=ProjectOut, tags=["Projects"])
async def update_project(
    project_id: UUID,
    project_data: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Met à jour un projet."""
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    for key, value in project_data.model_dump(exclude_unset=True).items():
        setattr(project, key, value)
    await db.commit()
    await db.refresh(project)
    return project


@app.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Projects"])
async def delete_project(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Supprime un projet et ses documents."""
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    await db.delete(project)
    await db.commit()
    return None


# ========== DOCUMENTS ==========
@app.get("/projects/{project_id}/documents", response_model=List[DocumentOut], tags=["Documents"])
async def get_project_documents(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Liste les documents d'un projet."""
    result = await db.execute(select(Document).where(Document.project_id == project_id))
    return result.scalars().all()


@app.post("/projects/{project_id}/documents", response_model=DocumentOut, status_code=status.HTTP_201_CREATED, tags=["Documents"])
async def upload_project_document(
    project_id: UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Uploade un document et le range dans un projet."""
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    clean = safe_filename(file.filename)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    stored_name = f"{timestamp}_{clean}"
    file_path = UPLOAD_DIR / stored_name
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

    document = Document(
        name=os.path.basename(file.filename or "") or clean,
        file_path=str(file_path),
        file_size=file_path.stat().st_size,
        content_type=file.content_type,
        project_id=project_id,
    )
    db.add(document)
    await db.commit()
    await db.refresh(document)
    return document


@app.get("/documents/{document_id}/download", tags=["Documents"])
async def download_document(
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Télécharge un document."""
    result = await db.execute(select(Document).where(Document.id == document_id))
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    if not Path(document.file_path).exists():
        raise HTTPException(status_code=404, detail="File missing on disk")
    return FileResponse(
        document.file_path,
        filename=document.name,
        media_type=document.content_type or "application/octet-stream",
    )


@app.delete("/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Documents"])
async def delete_document(
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Supprime un document (base + fichier)."""
    result = await db.execute(select(Document).where(Document.id == document_id))
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    try:
        Path(document.file_path).unlink(missing_ok=True)
    except Exception:
        pass
    await db.delete(document)
    await db.commit()
    return None


# ========== UPLOAD ENDPOINT ==========
@app.post("/upload", tags=["Utils"])
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user)
):
    """Upload un fichier (PDF, etc.) et retourne le path."""
    try:
        # Generate unique filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{timestamp}_{safe_filename(file.filename)}"
        file_path = UPLOAD_DIR / filename
        
        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        return {
            "filename": filename,
            "path": str(file_path),
            "size": file_path.stat().st_size
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


# ========== ASSISTANT: AGRÉGAT DU JOUR ==========
@app.get("/today", tags=["Assistant"])
async def get_today(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Agrégat 'aujourd'hui' pour l'assistant : tâches en retard/dues,
    prochaines actions clients, renouvellements d'abonnements à 7 jours."""
    now = datetime.now()
    start = datetime(now.year, now.month, now.day)
    end = start + timedelta(days=1)

    # Tâches non terminées avec échéance passée ou aujourd'hui
    result = await db.execute(
        select(Task)
        .where(Task.status != TaskStatus.DONE, Task.due_date.is_not(None), Task.due_date < end)
        .order_by(Task.due_date)
    )
    due_tasks = result.scalars().all()
    tasks_overdue = [t for t in due_tasks if t.due_date < start]
    tasks_due_today = [t for t in due_tasks if t.due_date >= start]

    # Clients (non archivés) avec une prochaine action passée ou aujourd'hui
    result = await db.execute(
        select(Client)
        .where(
            Client.status != ClientStatus.ARCHIVE,
            Client.next_action_date.is_not(None),
            Client.next_action_date < end,
        )
        .order_by(Client.next_action_date)
    )
    actions = result.scalars().all()

    # Abonnements à renouveler dans les 7 jours
    result = await db.execute(
        select(Finance)
        .where(
            Finance.type == FinanceType.SUBSCRIPTION,
            Finance.renewal_date.is_not(None),
            Finance.renewal_date >= start.date(),
            Finance.renewal_date <= (start + timedelta(days=7)).date(),
        )
        .order_by(Finance.renewal_date)
    )
    renewals = result.scalars().all()

    def task_brief(t: Task) -> dict:
        return {
            "id": str(t.id),
            "title": t.title,
            "status": t.status.value,
            "priority": t.priority.value,
            "due_date": t.due_date.isoformat() if t.due_date else None,
            "client_id": str(t.client_id) if t.client_id else None,
        }

    def client_brief(c: Client) -> dict:
        return {
            "id": str(c.id),
            "company_name": c.company_name,
            "status": c.status.value,
            "pipeline_stage": c.pipeline_stage.value,
            "next_action_date": c.next_action_date.isoformat() if c.next_action_date else None,
            "notes": c.notes,
        }

    return {
        "date": start.date().isoformat(),
        "tasks_overdue": [task_brief(t) for t in tasks_overdue],
        "tasks_due_today": [task_brief(t) for t in tasks_due_today],
        "client_next_actions": [client_brief(c) for c in actions],
        "subscription_renewals_7d": [
            {
                "id": str(f.id),
                "name": f.name,
                "amount": float(f.amount),
                "currency": f.currency,
                "renewal_date": f.renewal_date.isoformat() if f.renewal_date else None,
            }
            for f in renewals
        ],
    }


# ========== DASHBOARD STATS ==========
@app.get("/stats", response_model=DashboardStats, tags=["Dashboard"])
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Retourne les statistiques pour le dashboard."""
    return await build_dashboard_stats(db)
