from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token, create_refresh_token, verify_token
from app.repositories.user import user_repo
from app.schemas.user import UserCreate, UserResponse
from app.schemas.auth import Login, Token
from app.schemas.common import APIResponse
from app.core.config import settings

router = APIRouter()

class RefreshRequest(BaseModel):
    refresh_token: str

class AccessTokenResponse(BaseModel):
    access_token: str

@router.post("/register", response_model=APIResponse[UserResponse], status_code=status.HTTP_201_CREATED)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    user = await user_repo.get_by_email(db, email=user_in.email)
    if user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )

    hashed_password = get_password_hash(user_in.password)
    user_data = user_in.model_dump(exclude={"password"})
    user_data["password_hash"] = hashed_password

    new_user = await user_repo.create(db, obj_in=user_data)
    return APIResponse(status="success", message="User registered successfully", data=new_user)

@router.post("/login", response_model=APIResponse[Token])
async def login(login_data: Login, db: AsyncSession = Depends(get_db)):
    user = await user_repo.get_by_email(db, email=login_data.email)
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    access_token = create_access_token(subject=user.id)
    refresh_token = create_refresh_token(subject=user.id)

    token = Token(access_token=access_token, refresh_token=refresh_token)
    return APIResponse(status="success", message="Login successful", data=token)


@router.post("/refresh", response_model=APIResponse[AccessTokenResponse])
async def refresh_token_endpoint(payload: RefreshRequest, db: AsyncSession = Depends(get_db)):
    """Exchange a valid refresh token for a new access token.

    The refresh token is verified against ``JWT_REFRESH_SECRET_KEY`` (HS256).
    On success a fresh access token is issued. On any verification failure a
    401 is returned so the client can sign the user out.
    """
    try:
        user_id = verify_token(payload.refresh_token, settings.JWT_REFRESH_SECRET_KEY)
    except HTTPException:
        # verify_token already raises 401; re-raise with a clearer detail.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    # Confirm the user still exists and is active.
    from uuid import UUID
    try:
        user_uuid = UUID(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token subject",
        )

    user = await user_repo.get(db, user_uuid)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User no longer active",
        )

    new_access = create_access_token(subject=user.id)
    return APIResponse(
        status="success",
        message="Token refreshed",
        data=AccessTokenResponse(access_token=new_access),
    )
