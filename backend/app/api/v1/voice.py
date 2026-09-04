"""Voice session API — start a LiveKit room, end the interview, fire the
feedback Celery job.

The start endpoint seeds the voice-agent worker's per-process cache so the
worker (a separate process) can build a per-session system prompt without
hitting Postgres itself.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.prompts.personas import INTERVIEW_TYPES
from app.api.dependencies import get_current_user, get_db
from app.core.config import settings
from app.core.livekit import create_livekit_token
from app.models.interview import InterviewSession
from app.models.user import User
from app.voice.agent import cache_session_metadata

router = APIRouter()


class VoiceSessionStartRequest(BaseModel):
    job_role: str
    company_target: Optional[str] = None
    interview_type: str = "technical"
    persona: str = "friendly_tutor"
    resume_id: Optional[str] = None


class VoiceSessionResponse(BaseModel):
    session_id: str
    livekit_room_name: str
    livekit_token: str
    livekit_url: str


@router.post("/start", response_model=VoiceSessionResponse)
async def start_voice_session(
    request: VoiceSessionStartRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> VoiceSessionResponse:
    session_id = uuid.uuid4()
    room_name = f"interview-{session_id}"

    # Hot-spot extraction from the resume is best-effort; the worker's
    # system prompt degrades gracefully when none are present.
    resume_hot_spots: list[str] = []
    if request.resume_id:
        try:
            from app.models.resume import Resume

            r = (
                await db.execute(
                    select(Resume).where(
                        Resume.id == uuid.UUID(request.resume_id),
                        Resume.user_id == current_user.id,
                    )
                )
            ).scalars().first()
            if r and r.parsed_data:
                resume_hot_spots = list(r.parsed_data.get("interview_hot_spots", []) or [])
        except Exception:
            resume_hot_spots = []

    starter = INTERVIEW_TYPES.get(request.interview_type, INTERVIEW_TYPES["technical"])["starter"]

    interview = InterviewSession(
        id=session_id,
        user_id=current_user.id,
        job_role=request.job_role,
        company_target=request.company_target,
        interview_type=request.interview_type,
        persona=request.persona,
        livekit_room_id=room_name,
        resume_id=uuid.UUID(request.resume_id) if request.resume_id else None,
    )

    db.add(interview)
    await db.commit()
    await db.refresh(interview)

    # Seed the worker cache so the agent can build the right system prompt
    # the moment the room opens.
    cache_session_metadata(
        room_name,
        {
            "session_id": str(session_id),
            "persona": request.persona,
            "interview_type": request.interview_type,
            "job_role": request.job_role,
            "company_target": request.company_target,
            "resume_hot_spots": resume_hot_spots,
            "starter": starter,
        },
    )

    token = await create_livekit_token(
        room_name=room_name,
        participant_name=current_user.full_name or current_user.email,
        participant_identity=str(current_user.id),
    )

    return VoiceSessionResponse(
        session_id=str(session_id),
        livekit_room_name=room_name,
        livekit_token=token,
        livekit_url=settings.LIVEKIT_URL or "wss://dummy.livekit.cloud",
    )


@router.post("/{session_id}/end")
async def end_voice_session(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    interview = (
        await db.execute(
            select(InterviewSession).where(
                InterviewSession.id == session_id,
                InterviewSession.user_id == current_user.id,
            )
        )
    ).scalars().first()

    if not interview:
        raise HTTPException(status_code=404, detail="Interview session not found")

    interview.status = "completed"
    interview.ended_at = datetime.now(timezone.utc)
    if interview.started_at:
        interview.duration_seconds = int(
            (interview.ended_at - interview.started_at).total_seconds()
        )
    await db.commit()

    from app.tasks.interview_tasks import process_interview_report

    process_interview_report.delay(str(session_id))

    return {"message": "Session ended successfully", "session_id": str(session_id)}
