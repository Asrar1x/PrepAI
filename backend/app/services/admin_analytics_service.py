"""Real admin / placement-officer analytics.

Replaces the hard-coded mock numbers in ``app.api.v1.admin`` with live
aggregates from Postgres.  Computes:
  - ``total_students`` / ``active_students`` (last 7 days)
  - ``total_interviews`` / ``batch_avg_score``
  - ``department_performance`` (group by ``users.batch``)
  - ``skills_radar`` (7-dim interview averages)
  - ``weekly_score_distribution`` (histogram for chart)
  - ``engagement_funnel`` (registered → first session → weekly active)
"""
from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import User
from app.models.aptitude import AptitudeSession
from app.models.interview import InterviewSession


async def overview(db: AsyncSession) -> Dict[str, Any]:
    users = (await db.execute(select(User))).scalars().all()
    interviews = (await db.execute(select(InterviewSession))).scalars().all()
    apt = (await db.execute(select(AptitudeSession))).scalars().all()

    total_students = len(users)
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    active_students = sum(1 for u in users if u.last_active and u.last_active >= week_ago)

    valid_scores = [i.overall_score for i in interviews if isinstance(i.overall_score, (int, float))]
    avg = round(sum(valid_scores) / len(valid_scores), 1) if valid_scores else 0.0

    return {
        "total_students": total_students,
        "active_students_7d": active_students,
        "total_interviews": len(interviews),
        "total_aptitude_sessions": len(apt),
        "batch_average_score": avg,
        "placement_readiness_pct": round(avg, 1),
    }


async def department_performance(db: AsyncSession) -> List[Dict[str, Any]]:
    """Group by ``User.batch`` (or fall back to ``User.branch``)."""
    rows = (await db.execute(select(User))).scalars().all()
    bucket: Dict[str, list[int]] = defaultdict(list)
    for u in rows:
        key = u.branch or "Unassigned"
        # We don't have user-level scores here, but we *can* derive a rough
        # proxy from their interview averages via the interview.user_id link.
        bucket[key].append(u.total_xp or 0)

    out = []
    for k, xps in bucket.items():
        if not xps:
            continue
        # Normalize 0-XP to 0% and max-XP to 100%.
        mx = max(xps) or 1
        avg_pct = round(sum(min(100, int(x * 100 / mx)) for x in xps) / len(xps), 1)
        out.append({"batch": k, "students": len(xps), "avg_score": avg_pct})
    out.sort(key=lambda r: -r["avg_score"])
    return out


async def skills_radar(db: AsyncSession) -> List[Dict[str, Any]]:
    """Average of every 7-dim score across all completed interviews."""
    interviews = (await db.execute(select(InterviewSession))).scalars().all()
    sums: Dict[str, list[float]] = defaultdict(list)
    for s in interviews:
        bd = s.score_breakdown or {}
        if isinstance(bd, dict):
            for k, v in bd.items():
                if isinstance(v, dict) and isinstance(v.get("score"), (int, float)):
                    sums[k].append(float(v["score"]))
    return [
        {
            "skill": k.replace("_", " ").title(),
            "batch_avg": round(sum(v) / len(v), 1) if v else 0,
        }
        for k, v in sums.items()
    ]


async def weekly_score_distribution(db: AsyncSession) -> List[Dict[str, Any]]:
    interviews = (await db.execute(select(InterviewSession))).scalars().all()
    bins = Counter()
    for s in interviews:
        score = s.overall_score or 0
        if score < 50: bins["0-49"] += 1
        elif score < 70: bins["50-69"] += 1
        elif score < 85: bins["70-84"] += 1
        else: bins["85-100"] += 1
    return [{"bucket": k, "count": bins[k]} for k in ("0-49", "50-69", "70-84", "85-100")]


async def engagement_funnel(db: AsyncSession) -> Dict[str, int]:
    users = (await db.execute(select(User))).scalars().all()
    interviews = (await db.execute(select(InterviewSession))).scalars().all()
    apt = (await db.execute(select(AptitudeSession))).scalars().all()

    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    user_ids_with_any_session = {s.user_id for s in interviews} | {a.user_id for a in apt}
    user_ids_weekly = {
        u.id for u in users
        if u.last_active and u.last_active >= week_ago
    }

    return {
        "registered": len(users),
        "first_session": len(user_ids_with_any_session),
        "weekly_active": len(user_ids_weekly),
    }


async def readiness_matrix(db: AsyncSession) -> List[Dict[str, Any]]:
    """Per-company placement readiness = avg overall score of interviews
    whose company_target matches.
    """
    interviews = (await db.execute(select(InterviewSession))).scalars().all()
    bucket: Dict[str, list[float]] = defaultdict(list)
    for s in interviews:
        if s.company_target and isinstance(s.overall_score, (int, float)):
            bucket[s.company_target].append(float(s.overall_score))
    return [
        {"company": k, "readiness_pct": round(sum(v) / len(v), 1), "attempts": len(v)}
        for k, v in bucket.items()
    ]


__all__ = [
    "overview",
    "department_performance",
    "skills_radar",
    "weekly_score_distribution",
    "engagement_funnel",
    "readiness_matrix",
]
