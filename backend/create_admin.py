"""Script simple pour créer l'admin avec le bon email."""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models import User
from app.auth import get_password_hash


async def create_admin():
    """Crée l'utilisateur admin@aetheria.com."""
    admin_email = "admin@aetheria.com"
    admin_password = "admin123"
    
    print(f"Creating admin user: {admin_email}")
    
    async with AsyncSessionLocal() as session:
        # Supprimer tous les users
        result = await session.execute(select(User))
        users = result.scalars().all()
        for user in users:
            await session.delete(user)
        await session.commit()
        print("Deleted old users")
        
        # Créer le nouvel admin
        hashed_password = get_password_hash(admin_password)
        admin_user = User(
            email=admin_email,
            hashed_password=hashed_password,
            is_active=True,
            role="admin"
        )
        
        session.add(admin_user)
        await session.commit()
        await session.refresh(admin_user)
        
        print(f"✅ Admin created successfully!")
        print(f"   Email: {admin_email}")
        print(f"   Password: {admin_password}")
        print(f"   ID: {admin_user.id}")


if __name__ == "__main__":
    asyncio.run(create_admin())
