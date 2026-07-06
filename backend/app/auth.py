"""Authentication logic - JWT simple."""
import os
import secrets
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from .database import get_db
from .models import User
from .schemas import TokenData

# Config
# Sécurité : on refuse toute valeur par défaut connue. Si SECRET_KEY n'est pas
# fournie (ou reprend l'ancienne valeur d'exemple), on génère une clé aléatoire
# éphémère -> les tokens ne peuvent pas être forgés, mais ils sont invalidés à
# chaque redémarrage. En production, DÉFINISSEZ SECRET_KEY pour des sessions stables.
_INSECURE_DEFAULTS = {
    "",
    "your-secret-key-change-this-in-production-min-32-chars",
}
SECRET_KEY = os.getenv("SECRET_KEY", "").strip()
if SECRET_KEY in _INSECURE_DEFAULTS:
    SECRET_KEY = secrets.token_urlsafe(48)
    print(
        "⚠️  SECRET_KEY non défini (ou valeur d'exemple) : génération d'une clé "
        "aléatoire éphémère. Définissez SECRET_KEY dans l'environnement pour "
        "garder les sessions valides après un redémarrage."
    )
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "10080"))

# Clé API de service (pour bots/automations type n8n).
# Si CRM_API_KEY n'est pas défini, cette voie d'auth est désactivée.
CRM_API_KEY = os.getenv("CRM_API_KEY", "").strip()

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme (auto_error=False pour laisser passer l'auth par clé API)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token", auto_error=False)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Vérifie le mot de passe."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash le mot de passe."""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Crée un JWT token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
    """Récupère un user par email."""
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def authenticate_user(db: AsyncSession, email: str, password: str) -> Optional[User]:
    """Authentifie un user."""
    user = await get_user_by_email(db, email)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


async def get_current_user(
    request: Request,
    token: Optional[str] = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Dependency qui récupère le user courant depuis le JWT ou une clé API (X-API-Key)."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # Voie 1 : clé API de service (bots/automations, ex: n8n)
    api_key = request.headers.get("X-API-Key", "")
    if CRM_API_KEY and api_key and secrets.compare_digest(api_key, CRM_API_KEY):
        result = await db.execute(
            select(User).where(User.is_active == True).order_by(User.created_at)  # noqa: E712
        )
        service_user = result.scalars().first()
        if service_user:
            return service_user
        raise credentials_exception

    # Voie 2 : JWT classique
    if not token:
        raise credentials_exception
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email)
    except JWTError:
        raise credentials_exception

    user = await get_user_by_email(db, email=token_data.email)
    if user is None:
        raise credentials_exception
    return user


async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Dependency qui vérifie que le user est actif."""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user
