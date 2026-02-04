"""Script d'initialisation de la DB et création de l'utilisateur admin."""
import asyncio
import os
import sys
from pathlib import Path

# Ajouter le dossier parent au path pour importer app
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import AsyncSessionLocal, engine, Base
from app.models import User
from app.auth import get_password_hash


async def init_database():
    """Crée toutes les tables."""
    print("🔨 Creating database tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Database tables created!")


async def create_admin_user():
    """Crée l'utilisateur admin depuis les variables d'environnement."""
    admin_email = os.getenv("ADMIN_EMAIL", "admin@aetheria.local")
    admin_password = os.getenv("ADMIN_PASSWORD", "admin123")
    
    print(f"👤 Checking if admin user exists: {admin_email}")
    
    async with AsyncSessionLocal() as session:
        # Vérifier si l'admin existe déjà
        result = await session.execute(select(User).where(User.email == admin_email))
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            print(f"⚠️  Admin user already exists: {admin_email}")
            return
        
        # Créer l'admin
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
        
        print(f"✅ Admin user created successfully!")
        print(f"   Email: {admin_email}")
        print(f"   Password: {admin_password}")
        print(f"   ID: {admin_user.id}")


async def main():
    """Point d'entrée principal."""
    print("\n" + "="*50)
    print("  Aetheria Internal OS - Database Initialization")
    print("="*50 + "\n")
    
    try:
        # Étape 1: Créer les tables
        await init_database()
        
        # Étape 2: Créer l'admin
        await create_admin_user()
        
        print("\n" + "="*50)
        print("  ✨ Initialization completed successfully!")
        print("="*50 + "\n")
        
    except Exception as e:
        print(f"\n❌ Error during initialization: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
