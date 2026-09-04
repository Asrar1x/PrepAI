"""Pydantic schemas for the Role & Company Intelligence Engine (Module 1)."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


# ----------------------------------------------------------------------
# Roles
# ----------------------------------------------------------------------


class RoleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    slug: str
    title: str
    category: str
    summary: str
    salary_range: str
    difficulty: str
    interview_rounds: int
    skills: List[str] = []


# ----------------------------------------------------------------------
# Companies
# ----------------------------------------------------------------------


class CompanyListItem(BaseModel):
    """Lightweight card used in the company picker grid."""
    model_config = ConfigDict(from_attributes=True)

    slug: str
    name: str
    industry: str
    hiring_signal: str
    salary_range: str
    assessment_summary: str = ""


class CompanyPatternRead(BaseModel):
    """Full 2026 pattern returned by the explainer view."""
    model_config = ConfigDict(from_attributes=True)

    slug: str
    name: str
    industry: str
    hiring_signal: str
    salary_range: str
    assessment_summary: str
    sections: List[Dict[str, Any]] = []
    timings: Dict[str, Any] = {}
    distribution: Dict[str, Any] = {}
    negative_marking: Dict[str, Any] = {}


# ----------------------------------------------------------------------
# Skill-gap → study plan
# ----------------------------------------------------------------------


class SkillGapRequest(BaseModel):
    role_slug: str
    company_slug: Optional[str] = None
    ratings: Dict[str, str] = Field(
        default_factory=dict,
        description="Mapping of skill name → strong/okay/weak/not_learned",
    )


class StudyPlanDay(BaseModel):
    day: int
    title: str
    focus_area: str
    estimated_minutes: int
    tasks: List[str] = []
    resources: List[Dict[str, str]] = []


class StudyPlanRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    role_slug: str
    company_slug: Optional[str] = None
    plan: Dict[str, Any]
    progress: float
    created_at: Optional[datetime] = None

    @field_validator("id", "user_id", mode="before")
    @classmethod
    def _coerce_uuid(cls, v: Any) -> str:
        return str(v) if isinstance(v, UUID) else v
