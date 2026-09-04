"""Aptitude test API — Module 2.

Per-category adaptive difficulty, Redis-cached solutions, Claude Haiku 4.5
question generation with local-GPT-2 + fallback bank.
"""
from __future__ import annotations

import logging
import random
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.aptitude import (
    AptitudeQuestion,
    AptitudeReport,
    AptitudeStartRequest,
    AptitudeSubmitRequest,
    AptitudeSubmitResponse,
)
from app.services import aptitude_service

logger = logging.getLogger(__name__)

router = APIRouter()

CATEGORIES = aptitude_service.CATEGORIES


def _pick_category(history: list, requested: Optional[str]) -> str:
    if requested and requested in CATEGORIES:
        return requested
    # Pick the category the student has the fewest answers for; break ties
    # randomly so the student gets coverage across the syllabus.
    counts = {c: 0 for c in CATEGORIES}
    for h in history or []:
        c = h.get("category")
        if c in counts:
            counts[c] += 1
    min_count = min(counts.values())
    candidates = [c for c, n in counts.items() if n == min_count]
    return random.choice(candidates)


@router.post("/start", response_model=AptitudeReport, status_code=status.HTTP_201_CREATED)
async def start_session(
    payload: AptitudeStartRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = await aptitude_service.start_session(
        db,
        user_id=current_user.id,
        role_slug=payload.role_slug,
        company_slug=payload.company_slug,
        mode=payload.mode,
        duration_minutes=payload.duration_minutes,
    )
    return AptitudeReport.model_validate(session)


@router.post("/{session_id}/next-question", response_model=AptitudeQuestion)
async def next_question(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = await aptitude_service.get_session(db, uuid.UUID(session_id), current_user.id)
    if not session:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Unknown session")

    history = list(session.questions_data or [])
    category = _pick_category(history, payload_category := None)
    difficulty = aptitude_service.adjust_difficulty(history, category)
    q = await aptitude_service.generate_question(
        category=category,
        difficulty=difficulty,
        role=session.job_role,
        company=session.company_pattern,
    )
    # Don't leak the answer in the response
    safe = AptitudeQuestion(
        id=q["id"],
        category=q.get("category", category),
        difficulty=q.get("difficulty", difficulty),
        question=q["question"],
        options=q.get("options", []),
        topic=q.get("topic"),
        estimated_seconds=q.get("estimated_seconds", 90),
        source=q.get("source"),
    )
    return safe


@router.post("/{session_id}/submit", response_model=AptitudeSubmitResponse)
async def submit_answer(
    session_id: str,
    payload: AptitudeSubmitRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = await aptitude_service.get_session(db, uuid.UUID(session_id), current_user.id)
    if not session:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Unknown session")

    # Build the question shell from cache / fallback
    solution = await aptitude_service.get_solution(payload.question_id) or {}
    correct_index = int(solution.get("correct_index", 0))
    is_correct = payload.selected_index == correct_index

    # Persist the answer.  We only have a skeleton question for now (id only),
    # so category/difficulty are derived from the *next* difficulty the engine
    # would have picked.  The detailed record is still saved with the
    # correct_index we just resolved.
    question_shell = {
        "id": payload.question_id,
        "category": solution.get("category", "unknown"),
        "difficulty": solution.get("difficulty", "easy"),
        "correct_index": correct_index,
        "topic": solution.get("topic"),
    }
    await aptitude_service.record_answer(
        db, session, question_shell, payload.selected_index, is_correct, payload.time_taken_seconds
    )
    return AptitudeSubmitResponse(
        is_correct=is_correct,
        correct_index=correct_index,
        explanation=solution.get("explanation"),
        solution=solution,
    )


@router.post("/{session_id}/end", response_model=AptitudeReport)
async def end_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = await aptitude_service.get_session(db, uuid.UUID(session_id), current_user.id)
    if not session:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Unknown session")
    # Award XP via the gamification hook
    current_user.total_xp = (current_user.total_xp or 0) + 30
    await db.commit()
    await db.refresh(session)
    return AptitudeReport.model_validate(session)


@router.get("/{session_id}/report", response_model=AptitudeReport)
async def get_report(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = await aptitude_service.get_session(db, uuid.UUID(session_id), current_user.id)
    if not session:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Unknown session")
    return AptitudeReport.model_validate(session)
