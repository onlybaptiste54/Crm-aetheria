"""FastAPI Main App - Routes CRUD directes, pas de routers séparés."""
import os
import shutil
from datetime import timedelta, datetime
from uuid import UUID
from pathlib import Path
from typing import List

from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, extract

from .database import get_db, engine, Base
from .auth import (
    authenticate_user,
    create_access_token,
    get_current_active_user,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)
from .models import User, Client, Task, Finance, MeetingNote, FinanceType, TaskStatus, ClientStatus
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
    DashboardStats,
)

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


# ========== STARTUP EVENT ==========
@app.on_event("startup")
async def startup_event():
    """Create tables on startup (pour dev, en prod utiliser Alembic)."""
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
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
        filename = f"{timestamp}_{file.filename}"
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


# ========== DASHBOARD STATS ==========
@app.get("/stats", response_model=DashboardStats, tags=["Dashboard"])
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Retourne les statistiques pour le dashboard."""
    # Total MRR (Subscriptions seulement)
    mrr_result = await db.execute(
        select(func.sum(Finance.amount)).where(Finance.type == FinanceType.SUBSCRIPTION)
    )
    total_mrr = mrr_result.scalar() or 0.0
    
    # Total expenses this month
    current_month = datetime.now().month
    current_year = datetime.now().year
    expenses_result = await db.execute(
        select(func.sum(Finance.amount)).where(
            extract('month', Finance.billing_date) == current_month,
            extract('year', Finance.billing_date) == current_year
        )
    )
    total_expenses_this_month = expenses_result.scalar() or 0.0
    
    # Active clients count
    clients_result = await db.execute(
        select(func.count(Client.id)).where(Client.status == ClientStatus.CLIENT)
    )
    active_clients_count = clients_result.scalar() or 0
    
    # Pending tasks count (pas Done)
    tasks_result = await db.execute(
        select(func.count(Task.id)).where(Task.status != TaskStatus.DONE)
    )
    pending_tasks_count = tasks_result.scalar() or 0
    
    # Tasks due today
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = datetime.now().replace(hour=23, minute=59, second=59, microsecond=999999)
    tasks_due_today_result = await db.execute(
        select(func.count(Task.id)).where(
            Task.due_date.between(today_start, today_end)
        )
    )
    tasks_due_today = tasks_due_today_result.scalar() or 0
    
    return DashboardStats(
        total_mrr=float(total_mrr),
        total_expenses_this_month=float(total_expenses_this_month),
        active_clients_count=active_clients_count,
        pending_tasks_count=pending_tasks_count,
        tasks_due_today=tasks_due_today
    )
