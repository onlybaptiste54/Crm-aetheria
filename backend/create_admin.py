"""Script simple pour créer l'admin (supprime les users existants, recrée 1 admin depuis .env.prod)."""
import asyncio
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

# .env.prod est à la RACINE du projet (à côté de docker-compose.prod.yml)
# Chercher dans plusieurs emplacements possibles
from dotenv import load_dotenv

# Chemins possibles pour .env.prod
possible_paths = [
    Path("/app/.env.prod"),  # Si monté par le compose
    Path(__file__).parent.parent / ".env.prod",  # Racine du projet (parent de backend/)
    Path(__file__).parent / ".env.prod",  # Dans backend/ (fallback)
]

env_prod_loaded = False
for env_path in possible_paths:
    if env_path.exists():
        load_dotenv(env_path, override=True)
        print(f"✅ Loaded .env.prod from {env_path}")
        env_prod_loaded = True
        break

if not env_prod_loaded:
    print(f"⚠️  .env.prod not found, using environment variables")
    print(f"   Tried: {[str(p) for p in possible_paths]}")

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models import User
from app.auth import get_password_hash


async def create_admin():
    """Supprime tous les users puis crée l'admin depuis ADMIN_EMAIL et ADMIN_PASSWORD (.env.prod)."""
    admin_email = os.getenv("ADMIN_EMAIL", "admin@aetheria.com")
    admin_password = os.getenv("ADMIN_PASSWORD", "admin123")
    
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
