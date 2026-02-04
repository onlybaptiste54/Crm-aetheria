"""Pydantic Schemas V2 - Tous les schémas regroupés ici."""
from pydantic import BaseModel, EmailStr, ConfigDict
from datetime import datetime, date
from uuid import UUID
from typing import Optional
from .models import ClientStatus, PipelineStage, Priority, CompanySize, TaskStatus, FinanceType, FinanceCategory


# ========== USER SCHEMAS ==========
class UserBase(BaseModel):
    email: EmailStr


class UserCreate(UserBase):
    password: str


class UserOut(UserBase):
    id: UUID
    is_active: bool
    role: str
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# ========== AUTH SCHEMAS ==========
class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: str | None = None


# ========== CLIENT SCHEMAS ==========
class ClientBase(BaseModel):
    company_name: str
    contact_person: Optional[str] = None
    status: ClientStatus = ClientStatus.PROSPECT
    pipeline_stage: PipelineStage = PipelineStage.NEW
    priority: Priority = Priority.MEDIUM
    sector: Optional[str] = None
    company_size: Optional[CompanySize] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    next_action_date: Optional[datetime] = None
    notes: Optional[str] = None


class ClientCreate(ClientBase):
    pass


class ClientUpdate(BaseModel):
    company_name: Optional[str] = None
    contact_person: Optional[str] = None
    status: Optional[ClientStatus] = None
    pipeline_stage: Optional[PipelineStage] = None
    priority: Optional[Priority] = None
    sector: Optional[str] = None
    company_size: Optional[CompanySize] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    next_action_date: Optional[datetime] = None
    notes: Optional[str] = None


class ClientOut(ClientBase):
    id: UUID
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# ========== TASK SCHEMAS ==========
class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: TaskStatus = TaskStatus.BACKLOG
    priority: Priority = Priority.MEDIUM
    due_date: Optional[datetime] = None
    tags: Optional[list[str]] = None
    client_id: Optional[UUID] = None


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[TaskStatus] = None
    priority: Optional[Priority] = None
    due_date: Optional[datetime] = None
    tags: Optional[list[str]] = None
    client_id: Optional[UUID] = None


class TaskOut(TaskBase):
    id: UUID
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# ========== FINANCE SCHEMAS ==========
class FinanceBase(BaseModel):
    name: str
    type: FinanceType = FinanceType.ONE_OFF
    category: FinanceCategory = FinanceCategory.SOFTWARE
    amount: float
    currency: str = "EUR"
    billing_date: date
    renewal_date: Optional[date] = None
    is_paid: bool = False
    invoice_path: Optional[str] = None


class FinanceCreate(FinanceBase):
    pass


class FinanceUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[FinanceType] = None
    category: Optional[FinanceCategory] = None
    amount: Optional[float] = None
    currency: Optional[str] = None
    billing_date: Optional[date] = None
    renewal_date: Optional[date] = None
    is_paid: Optional[bool] = None
    invoice_path: Optional[str] = None


class FinanceOut(FinanceBase):
    id: UUID
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# ========== MEETING NOTE SCHEMAS ==========
class MeetingNoteBase(BaseModel):
    title: str
    date: datetime
    content: Optional[str] = None
    attachments: Optional[list[str]] = None
    client_id: UUID


class MeetingNoteCreate(MeetingNoteBase):
    pass


class MeetingNoteUpdate(BaseModel):
    title: Optional[str] = None
    date: Optional[datetime] = None
    content: Optional[str] = None
    attachments: Optional[list[str]] = None
    client_id: Optional[UUID] = None


class MeetingNoteOut(MeetingNoteBase):
    id: UUID
    
    model_config = ConfigDict(from_attributes=True)


# ========== STATS SCHEMA ==========
class DashboardStats(BaseModel):
    total_mrr: float
    total_expenses_this_month: float
    active_clients_count: int
    pending_tasks_count: int
    tasks_due_today: int
