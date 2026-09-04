"""Model 12 — Mental Health / Anxiety Index.

Pure service wrapper.  The model is a doc-locked weighted formula;
the data already lives in the database (session history).  This
module aggregates the last 5 sessions and asks the model manager
to compute the score.

This is intentionally interpretable (no NN) so the message returned
to the student can be honest: "your filler-word trend is up 30% in
the last week, take a short break".
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.custom_models.model_manager import get_models
from app.models.interview import InterviewSession

logger = logging.getLogger(__name__)


async def _recent_session_signals(
    db: AsyncSession, user_id: Any, limit: int = 5
) -> Dict[str, Any]:
    """Pull the last ``limit`` interview sessions for this user and
    compute the signals the anxiety formula needs."""
    try:
        r = await db.execute(
            select(InterviewSession)
            .where(InterviewSession.user_id == user_id)
            .order_by(InterviewSession.created_at.desc())
            .limit(limit)
        )
        sessions = list(r.scalars().all())
    except Exception as e:  # pragma: no cover
        logger.debug("anxiety session fetch failed: %s", e)
        return {}

    if not sessions:
        return {}

    fillers: List[int] = []
    latencies: List[float] = []
    scores: List[float] = []
    abandons = 0
    for s in sessions[::-1]:  # oldest first for trend maths
        sb = s.score_breakdown or {}
        dims = sb.get("dimensions") or {}
        scores.append(float(sb.get("overall_score", 0)))
        # latency proxy: average turn length / 200 ms target
        turns = sb.get("turn_count") or 0
        latencies.append(float((s.duration_seconds or turns * 30) / max(1, turns)) if turns else 60.0)
        fillers.append(int(dims.get("filler_count", 0)))
        if s.status == "abandoned":
            abandons += 1

    return {
        "filler_counts_last_5_sessions": fillers,
        "avg_latency_last_5_sessions":   latencies,
        "overall_scores_last_5_sessions": scores,
        "sessions_this_week":            sum(1 for s in sessions if _this_week(s)),
        "sessions_last_week":            sum(1 for s in sessions if _last_week(s)),
        "abandoned_sessions_ratio":      abandons / max(1, len(sessions)),
    }


def _this_week(s: InterviewSession) -> bool:  # pragma: no cover - small util
    from datetime import datetime, timedelta, timezone
    if not s.created_at:
        return False
    return s.created_at >= datetime.now(timezone.utc) - timedelta(days=7)


def _last_week(s: InterviewSession) -> bool:  # pragma: no cover
    from datetime import datetime, timedelta, timezone
    if not s.created_at:
        return False
    now = datetime.now(timezone.utc)
    return now - timedelta(days=14) <= s.created_at < now - timedelta(days=7)


async def compute_for_user(db: AsyncSession, user_id: Any) -> Dict[str, Any]:
    signals = await _recent_session_signals(db, user_id)
    if not signals:
        return {
            "anxiety_index": 0.0,
            "level": "calm",
            "message": "No recent sessions yet — take your first mock interview when you're ready.",
            "components": {},
            "source": "no-data",
        }
    return get_models().compute_anxiety(signals)


__all__ = ["compute_for_user"]
