from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token, create_refresh_token
from app.repositories.user import user_repo
from app.schemas.user import UserCreate, UserResponse
from app.schemas.auth import Login, Token
from app.schemas.common import APIResponse

router = APIRouter()

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
