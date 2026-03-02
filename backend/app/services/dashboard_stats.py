"""Simple services for dashboard-related metrics."""

from datetime import datetime

from sqlalchemy import extract, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Client, ClientStatus, Finance, FinanceType, Task, TaskStatus
from ..schemas import DashboardStats


async def get_recurring_expenses_monthly(db: AsyncSession) -> float:
    """All subscriptions are treated as monthly recurring expenses."""
    result = await db.execute(
        select(func.sum(Finance.amount)).where(Finance.type == FinanceType.SUBSCRIPTION)
    )
    return float(result.scalar() or 0.0)


async def get_one_off_expenses_for_month(db: AsyncSession, reference: datetime) -> float:
    """One-off expenses billed in the target month."""
    result = await db.execute(
        select(func.sum(Finance.amount)).where(
            Finance.type == FinanceType.ONE_OFF,
            extract("month", Finance.billing_date) == reference.month,
            extract("year", Finance.billing_date) == reference.year,
        )
    )
    return float(result.scalar() or 0.0)


async def get_active_clients_count(db: AsyncSession) -> int:
    result = await db.execute(
        select(func.count(Client.id)).where(Client.status == ClientStatus.CLIENT)
    )
    return int(result.scalar() or 0)


async def get_pending_tasks_count(db: AsyncSession) -> int:
    result = await db.execute(select(func.count(Task.id)).where(Task.status != TaskStatus.DONE))
    return int(result.scalar() or 0)


async def get_tasks_due_today_count(db: AsyncSession, reference: datetime) -> int:
    day_start = reference.replace(hour=0, minute=0, second=0, microsecond=0)
    day_end = reference.replace(hour=23, minute=59, second=59, microsecond=999999)
    result = await db.execute(
        select(func.count(Task.id)).where(Task.due_date.between(day_start, day_end))
    )
    return int(result.scalar() or 0)


async def build_dashboard_stats(db: AsyncSession) -> DashboardStats:
    now = datetime.now()

    recurring_monthly = await get_recurring_expenses_monthly(db)
    one_off_this_month = await get_one_off_expenses_for_month(db, now)
    active_clients_count = await get_active_clients_count(db)
    pending_tasks_count = await get_pending_tasks_count(db)
    tasks_due_today = await get_tasks_due_today_count(db, now)

    return DashboardStats(
        total_mrr=recurring_monthly,
        total_recurring_expenses_monthly=recurring_monthly,
        total_expenses_this_month=recurring_monthly + one_off_this_month,
        active_clients_count=active_clients_count,
        pending_tasks_count=pending_tasks_count,
        tasks_due_today=tasks_due_today,
    )
