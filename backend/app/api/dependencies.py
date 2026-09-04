from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import verify_token, oauth2_scheme
from app.core.config import settings
from app.models.user import User
from app.repositories.user import user_repo

oauth2_scheme_obj = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


async def get_current_user(
    db: AsyncSession = Depends(get_db),
    token: str | None = Depends(oauth2_scheme_obj),
) -> User:
    """Authenticate the current user.

    Production path: decode JWT, look up the user, enforce is_active.
    Dev path (DEBUG=true only): if no token is present, return the first user
    in the database so the front-end dev server (no proxy auth) keeps working.
    """
    if token:
        try:
            user_id = verify_token(token, settings.JWT_SECRET_KEY)
            user = await user_repo.get(db, id=user_id)
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
                )
            if not user.is_active:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user"
                )
            return user
        except HTTPException:
            raise
        except Exception:
            # Token present but invalid
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )

    # No token. In dev only, fall back to the first user.
    if settings.ENV == "production":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not settings.DEBUG:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Dev fallback: first user (create one if DB empty)
    result = await db.execute(select(User).limit(1))
    dev_user = result.scalars().first()
    if not dev_user:
        from app.core.security import get_password_hash

        dev_user = User(
            email="dev@prep.ai",
            full_name="Dev Student",
            role="student",
            password_hash=get_password_hash("devpass123"),
        )
        db.add(dev_user)
        await db.commit()
        await db.refresh(dev_user)
    return dev_user


class RoleChecker:
    """Dependency factory: only allow specific roles."""

    def __init__(self, allowed_roles: list[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, user: User = Depends(get_current_user)):
        if user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted",
            )
        return user
