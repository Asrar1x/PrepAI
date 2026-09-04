"""Celery task: turn a finished interview session into a full feedback report.

Pipeline:
  1. Load session + user from DB.
  2. Compute 7-dimension scores (heuristic, no GPU).
  3. Generate qualitative narrative — Claude Sonnet 4.6 if the key is set,
     deterministic fallback otherwise.
  4. Render the PDF (ReportLab).
  5. Update the row in Postgres.
  6. Fan out: email (Resend), WhatsApp (Meta), in-app notification.
"""
from __future__ import annotations

import asyncio
import logging
import os
import uuid
from typing import Any, Dict, List

from sqlalchemy import select

from app.core.celery_app import celery_app
from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models import User
from app.models.interview import InterviewSession
from app.services import notification_dispatcher, pdf_service, scoring_service

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.interview_tasks.process_interview_report")
def process_interview_report(session_id: str) -> Dict[str, Any]:
    """Run the full feedback pipeline.  Returns a small status dict for
    monitoring / debugging.
    """
    return asyncio.run(_async_process_interview_report(session_id))


async def _async_process_interview_report(session_id: str) -> Dict[str, Any]:
    async with AsyncSessionLocal() as db:
        interview = (
            await db.execute(
                select(InterviewSession).where(
                    InterviewSession.id == uuid.UUID(session_id)
                )
            )
        ).scalars().first()
        if not interview:
            logger.warning("interview %s not found", session_id)
            return {"session_id": session_id, "status": "missing"}

        transcript: List[Dict[str, Any]] = list(interview.transcript or [])
        interview_type = interview.interview_type or "technical"

        scoring = scoring_service.compute_seven_dimensions(
            transcript, interview_type
        )

        narrative = scoring_service.render_narrative_with_claude(
            scoring=scoring,
            transcript=transcript,
            job_role=interview.job_role or "Software Engineer",
            interview_type=interview_type,
            api_key=settings.CLAUDE_API_KEY,
        ) or scoring_service.fallback_narrative(scoring)

        meta = {
            "job_role": interview.job_role,
            "company_target": interview.company_target,
            "interview_type": interview.interview_type,
            "persona": interview.persona,
        }
        pdf_path = pdf_service.render_interview_pdf(
            session_id=str(session_id),
            interview_meta=meta,
            scoring=scoring,
            narrative=narrative,
            transcript=transcript,
        )

        # Persist the report.
        report_filename = os.path.basename(pdf_path)
        interview.overall_score = scoring["overall_score"]
        interview.score_breakdown = scoring["dimensions"]
        interview.feedback_report = {
            "overall_score": scoring["overall_score"],
            "strengths": narrative["strengths"],
            "improvements": narrative["improvements"],
            "next_steps": narrative["next_steps"],
        }
        interview.report_url = f"/reports/{report_filename}"
        interview.status = "completed"
        await db.commit()

        # Notifications.
        user = (
            await db.execute(select(User).where(User.id == interview.user_id))
        ).scalars().first()
        if user:
            try:
                await notification_dispatcher.dispatch(
                    db=db,
                    user=user,
                    trigger="interview_ready",
                    payload={
                        "report_url": interview.report_url,
                        "overall_score": scoring["overall_score"],
                    },
                )
            except Exception as e:  # pragma: no cover - notification path
                logger.warning("interview-ready notification failed: %s", e)

        return {
            "session_id": session_id,
            "overall_score": scoring["overall_score"],
            "pdf": report_filename,
            "narrative_source": "claude" if settings.CLAUDE_API_KEY else "fallback",
        }
