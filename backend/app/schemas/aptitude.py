"""Pydantic schemas for the Aptitude test engine (Module 2)."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


# ----------------------------------------------------------------------
# Question
# ----------------------------------------------------------------------


class AptitudeQuestion(BaseModel):
    id: str
    category: str
    difficulty: str
    question: str
    options: List[str]
    topic: Optional[str] = None
    estimated_seconds: int = 90
    source: Optional[str] = None


# ----------------------------------------------------------------------
# Session lifecycle
# ----------------------------------------------------------------------


class AptitudeStartRequest(BaseModel):
    role_slug: str
    company_slug: Optional[str] = None
    mode: str = Field(default="adaptive")
    duration_minutes: int = Field(default=30, ge=5, le=180)
    category: Optional[str] = Field(
        default=None,
        description="Optional category focus (quantitative/logical/verbal/coding/di/cs_core). Random if omitted.",
    )


class AptitudeSubmitRequest(BaseModel):
    question_id: str
    selected_index: int = Field(ge=0, le=10)
    time_taken_seconds: int = Field(ge=0, le=3600)


class AptitudeSubmitResponse(BaseModel):
    is_correct: bool
    correct_index: int
    explanation: Optional[str] = None
    solution: Optional[Dict[str, Any]] = None


class AptitudeReport(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    job_role: str
    company_pattern: Optional[str] = None
    mode: str
    total_questions: int
    correct_count: int
    wrong_count: int
    skipped_count: int
    score: float
    max_difficulty_reached: Optional[str] = None
    category_scores: Dict[str, Any] = Field(default_factory=dict)
    weak_topics: List[Any] = Field(default_factory=list)
    created_at: Optional[datetime] = None

    @field_validator("id", "user_id", mode="before")
    @classmethod
    def _coerce_uuid(cls, v: Any) -> str:
        return str(v) if isinstance(v, UUID) else v
