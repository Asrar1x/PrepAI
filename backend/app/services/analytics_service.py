"""Per-user dashboard analytics — readiness, streaks, weekly trends,
company-readiness, recent activity.  Powers ``GET /users/me/dashboard``.
"""
from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import User
from app.models.aptitude import AptitudeSession
from app.models.interview import InterviewSession


async def build_dashboard(db: AsyncSession, user: User) -> Dict[str, Any]:
    """Compose the student dashboard payload from live data."""
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)

    # 7-dim trend (avg per dimension across last 7 days)
    int_rows = (
        await db.execute(
            select(InterviewSession)
            .where(
                InterviewSession.user_id == user.id,
                InterviewSession.started_at >= week_ago,
            )
            .order_by(InterviewSession.started_at.desc())
        )
    ).scalars().all()

    dim_totals: Dict[str, list[float]] = defaultdict(list)
    for s in int_rows:
        breakdown = s.score_breakdown or {}
        if isinstance(breakdown, dict):
            for k, v in breakdown.items():
                if isinstance(v, dict) and isinstance(v.get("score"), (int, float)):
                    dim_totals[k].append(float(v["score"]))
    weekly_dimensions = {k: round(sum(v) / len(v), 1) for k, v in dim_totals.items()}

    # Recent sessions (last 5 of either type)
    recent: List[Dict[str, Any]] = []
    for s in int_rows[:5]:
        recent.append({
            "id": str(s.id),
            "kind": "interview",
            "title": f"{s.interview_type.title()} Interview — {s.job_role}",
            "score": s.overall_score or 0,
            "started_at": s.started_at.isoformat() if s.started_at else None,
        })

    apt_rows = (
        await db.execute(
            select(AptitudeSession)
            .where(AptitudeSession.user_id == user.id)
            .order_by(AptitudeSession.created_at.desc())
            .limit(5)
        )
    ).scalars().all()
    for a in apt_rows:
        recent.append({
            "id": str(a.id),
            "kind": "aptitude",
            "title": f"Aptitude — {a.job_role or 'General'}",
            "score": a.score or 0,
            "started_at": a.created_at.isoformat() if a.created_at else None,
        })

    recent.sort(key=lambda r: r.get("started_at") or "", reverse=True)
    recent = recent[:5]

    # Placement countdown — first interview in target_roles' companies.
    placement_countdown = None
    target_role = (user.target_roles or ["Software Engineer"])[0] if user.target_roles else "Software Engineer"
    grad = getattr(user, "target_graduation", None)
    if grad:
        delta = (grad - now).days
        placement_countdown = max(0, delta)

    # Readiness = avg overall interview score (last 30 days) blended with 0.4 weight on aptitude avg.
    month_ago = now - timedelta(days=30)
    int_month = (await db.execute(
        select(InterviewSession).where(
            InterviewSession.user_id == user.id,
            InterviewSession.started_at >= month_ago,
        )
    )).scalars().all()
    apt_month = (await db.execute(
        select(AptitudeSession).where(
            AptitudeSession.user_id == user.id,
            AptitudeSession.created_at >= month_ago,
        )
    )).scalars().all()

    int_avg = (
        sum((s.overall_score or 0) for s in int_month) / len(int_month) if int_month else 0
    )
    apt_avg = (
        sum((s.score or 0) for s in apt_month) / len(apt_month) if apt_month else 0
    )
    readiness = round(int_avg * 0.6 + apt_avg * 0.4, 1)

    return {
        "user": {
            "id": str(user.id),
            "name": user.full_name,
            "email": user.email,
            "target_role": target_role,
        },
        "readiness": readiness,
        "streak_days": user.current_streak or 0,
        "longest_streak": user.longest_streak or 0,
        "total_xp": user.total_xp or 0,
        "placement_countdown_days": placement_countdown,
        "weekly_dimensions": weekly_dimensions,
        "recent_sessions": recent,
    }


async def company_readiness(
    db: AsyncSession, user: User
) -> List[Dict[str, Any]]:
    """Per-company readiness: avg score of interviews whose company_target
    matches.  Returns one row per company the user has touched.
    """
    rows = (
        await db.execute(
            select(InterviewSession).where(InterviewSession.user_id == user.id)
        )
    ).scalars().all()
    by_company: Dict[str, list[float]] = defaultdict(list)
    for r in rows:
        if r.company_target and r.overall_score is not None:
            by_company[r.company_target].append(float(r.overall_score))
    out = []
    for c, scores in by_company.items():
        out.append({
            "company": c,
            "avg_score": round(sum(scores) / len(scores), 1),
            "attempts": len(scores),
        })
    out.sort(key=lambda r: -r["avg_score"])
    return out


__all__ = ["build_dashboard", "company_readiness"]
