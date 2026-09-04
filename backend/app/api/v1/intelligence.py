"""Role & Company Intelligence API — Module 1."""
from __future__ import annotations

import logging
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.intelligence import (
    CompanyListItem,
    CompanyPatternRead,
    RoleRead,
    SkillGapRequest,
    StudyPlanRead,
)
from app.services import intelligence_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/intelligence", tags=["intelligence"])


@router.get("/roles", response_model=List[RoleRead])
async def list_roles(
    category: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """List all active roles (with optional category filter)."""
    roles = await intelligence_service.list_roles(db, category=category)
    return [RoleRead.model_validate(r) for r in roles]


@router.get("/companies", response_model=List[CompanyListItem])
async def list_companies(
    hiring_signal: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """List active companies (with optional hiring-signal filter)."""
    companies = await intelligence_service.list_companies(db, hiring_signal=hiring_signal)
    return [CompanyListItem.model_validate(c) for c in companies]


@router.get("/companies/{slug}/pattern", response_model=CompanyPatternRead)
async def get_company_pattern(
    slug: str,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Full 2026 assessment pattern for one company."""
    company = await intelligence_service.get_company_pattern(db, slug)
    if not company:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=f"Unknown company: {slug}")
    return CompanyPatternRead.model_validate(company)


@router.post(
    "/skill-gap",
    response_model=StudyPlanRead,
    status_code=status.HTTP_201_CREATED,
)
async def generate_skill_gap_plan(
    payload: SkillGapRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate a 30-day study plan from a student's self-rated skill matrix."""
    try:
        plan = await intelligence_service.generate_study_plan(
            db,
            user_id=current_user.id,
            role_slug=payload.role_slug,
            company_slug=payload.company_slug,
            ratings=payload.ratings,
        )
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(e))
    return StudyPlanRead.model_validate(plan)
