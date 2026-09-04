from pydantic import BaseModel, EmailStr
from uuid import UUID
from datetime import datetime
from typing import List, Optional

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    college_name: Optional[str] = None
    branch: Optional[str] = None
    graduation_year: Optional[int] = None
    target_roles: List[str] = []

class UserResponse(BaseModel):
    id: UUID
    email: EmailStr
    full_name: str
    college_name: Optional[str]
    branch: Optional[str]
    graduation_year: Optional[int]
    target_roles: List[str]
    current_streak: int
    longest_streak: int
    total_xp: int
    role: str
    created_at: datetime
    
    model_config = {"from_attributes": True}
