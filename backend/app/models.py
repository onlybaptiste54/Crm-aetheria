"""SQLAlchemy Models - Tous les modèles regroupés ici."""
import uuid
from datetime import datetime
from sqlalchemy import String, Text, DateTime, Boolean, Enum as SQLEnum, Numeric, Date, ARRAY, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base
import enum


# ========== ENUMS ==========
class ClientStatus(str, enum.Enum):
    PROSPECT = "Prospect"
    CLIENT = "Client"
    ARCHIVE = "Archive"


class PipelineStage(str, enum.Enum):
    NEW = "New"
    CONTACTED = "Contacted"
    MEETING_BOOKED = "Meeting Booked"
    DEV = "Dev"
    SIGNED = "Signed"
    DELIVERED = "Delivered"


class Priority(str, enum.Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"


class CompanySize(str, enum.Enum):
    TPE = "TPE"
    PME = "PME"
    ETI = "ETI"
    GE = "GE"


class TaskStatus(str, enum.Enum):
    BACKLOG = "Backlog"
    TODO = "Todo"
    IN_PROGRESS = "In Progress"
    VALIDATION = "Validation"
    DONE = "Done"


class FinanceType(str, enum.Enum):
    SUBSCRIPTION = "Subscription"
    ONE_OFF = "One-off"


class FinanceCategory(str, enum.Enum):
    SOFTWARE = "Software"
    HARDWARE = "Hardware"
    SERVICE = "Service"
    OFFICE = "Office"


# ========== MODELS ==========
class User(Base):
    """Table User pour l'authentification."""
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    role: Mapped[str] = mapped_column(String(50), default="admin")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Client(Base):
    """Table Clients - CRM et Prospection."""
    __tablename__ = "clients"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_name: Mapped[str] = mapped_column(String(255), nullable=False)
    contact_person: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[ClientStatus] = mapped_column(SQLEnum(ClientStatus), default=ClientStatus.PROSPECT)
    pipeline_stage: Mapped[PipelineStage] = mapped_column(SQLEnum(PipelineStage), default=PipelineStage.NEW)
    priority: Mapped[Priority] = mapped_column(SQLEnum(Priority), default=Priority.MEDIUM)
    sector: Mapped[str | None] = mapped_column(String(255), nullable=True)
    company_size: Mapped[CompanySize | None] = mapped_column(SQLEnum(CompanySize), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    next_action_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relations
    tasks = relationship("Task", back_populates="client", cascade="all, delete-orphan")
    meeting_notes = relationship("MeetingNote", back_populates="client", cascade="all, delete-orphan")


class Task(Base):
    """Table Tasks - Kanban."""
    __tablename__ = "tasks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[TaskStatus] = mapped_column(SQLEnum(TaskStatus), default=TaskStatus.BACKLOG)
    priority: Mapped[Priority] = mapped_column(SQLEnum(Priority), default=Priority.MEDIUM)
    due_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    tags: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # FK
    client_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=True)
    
    # Relations
    client = relationship("Client", back_populates="tasks")


class Finance(Base):
    """Table Finances - Dépenses et Abonnements."""
    __tablename__ = "finances"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[FinanceType] = mapped_column(SQLEnum(FinanceType), default=FinanceType.ONE_OFF)
    category: Mapped[FinanceCategory] = mapped_column(SQLEnum(FinanceCategory), default=FinanceCategory.SOFTWARE)
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="EUR")
    billing_date: Mapped[datetime] = mapped_column(Date, nullable=False)
    renewal_date: Mapped[datetime | None] = mapped_column(Date, nullable=True)
    is_paid: Mapped[bool] = mapped_column(Boolean, default=False)
    invoice_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class MeetingNote(Base):
    """Table Meeting Notes - Comptes-rendus."""
    __tablename__ = "meeting_notes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    date: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    attachments: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    
    # FK
    client_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False)
    
    # Relations
    client = relationship("Client", back_populates="meeting_notes")
