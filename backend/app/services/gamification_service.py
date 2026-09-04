"""Centralized XP / streak / badge rules.

Replaces ad-hoc ``current_user.total_xp += N`` with auditable, testable
award calls.  Triggered from the aptitude / interview end paths.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models import User, Badge, UserBadge
from app.models.aptitude import AptitudeSession
from app.models.interview import InterviewSession

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# XP rules
# ---------------------------------------------------------------------------

XP_RULES = {
    "aptitude_complete": 30,
    "aptitude_perfect": 60,   # 100% score
    "interview_complete": 50,
    "interview_strong": 100,  # >= 80 overall
    "daily_quest_complete": 25,
    "resume_upload": 15,
}


# ---------------------------------------------------------------------------
# Award
# ---------------------------------------------------------------------------


async def award(
    db: AsyncSession,
    user: User,
    event: str,
    *,
    multiplier: float = 1.0,
) -> int:
    """Add XP for an event and return the new total.

    Multiplier is a hook for difficulty-weighting (e.g. 1.5x for hard
    questions) without changing the rule table.
    """
    base = XP_RULES.get(event)
    if base is None:
        logger.warning("unknown gamification event: %s", event)
        return user.total_xp or 0

    points = int(base * multiplier)
    user.total_xp = (user.total_xp or 0) + points
    user.last_active = datetime.now(timezone.utc)

    # Streak: increment if last_active was yesterday, reset if older.
    today = datetime.now(timezone.utc).date()
    last = user.last_active_date.date() if user.last_active_date else None
    if last == today:
        pass  # already counted today
    elif last is not None and (today - last).days == 1:
        user.current_streak = (user.current_streak or 0) + 1
        user.longest_streak = max(user.longest_streak or 0, user.current_streak)
        user.last_active_date = datetime.now(timezone.utc)
    else:
        user.current_streak = 1
        user.last_active_date = datetime.now(timezone.utc)

    await db.flush()
    await _maybe_award_badges(db, user)
    return user.total_xp


# ---------------------------------------------------------------------------
# Badges
# ---------------------------------------------------------------------------


BADGE_RULES = {
    "first_interview":     ("First Interview",       "Complete your first mock interview."),
    "first_aptitude":      ("First Aptitude Test",   "Complete your first aptitude test."),
    "seven_day_streak":    ("7-Day Streak",          "Practice 7 days in a row."),
    "perfect_score":       ("Perfect Score",         "Score 100% on an aptitude test."),
    "ten_interviews":      ("10 Interviews",         "Complete 10 mock interviews."),
}


async def _maybe_award_badges(db: AsyncSession, user: User) -> None:
    if (user.total_xp or 0) >= 0:
        # First interview
        int_count = (await db.execute(
            select(InterviewSession).where(InterviewSession.user_id == user.id)
        )).scalars().all()
        if len(int_count) >= 1:
            await _grant_badge(db, user, "first_interview")
        if len(int_count) >= 10:
            await _grant_badge(db, user, "ten_interviews")

        # First aptitude
        apt_count = (await db.execute(
            select(AptitudeSession).where(AptitudeSession.user_id == user.id)
        )).scalars().all()
        if apt_count:
            await _grant_badge(db, user, "first_aptitude")
            if any((a.score or 0) >= 100 for a in apt_count):
                await _grant_badge(db, user, "perfect_score")

    if (user.current_streak or 0) >= 7:
        await _grant_badge(db, user, "seven_day_streak")


async def _grant_badge(db: AsyncSession, user: User, slug: str) -> None:
    badge = (await db.execute(select(Badge).where(Badge.slug == slug))).scalars().first()
    if not badge:
        badge = Badge(slug=slug, title=BADGE_RULES[slug][0], description=BADGE_RULES[slug][1])
        db.add(badge)
        await db.flush()

    existing = (await db.execute(
        select(UserBadge).where(
            UserBadge.user_id == user.id,
            UserBadge.badge_id == badge.id,
        )
    )).scalars().first()
    if existing:
        return
    db.add(UserBadge(user_id=user.id, badge_id=badge.id))


# ---------------------------------------------------------------------------
# Leaderboard
# ---------------------------------------------------------------------------


async def leaderboard(
    db: AsyncSession,
    scope: str = "all",
    limit: int = 20,
) -> list[dict]:
    q = select(User).order_by(User.total_xp.desc()).limit(limit)
    rows = (await db.execute(q)).scalars().all()
    return [
        {
            "rank": i + 1,
            "user_id": str(u.id),
            "name": u.full_name or u.email,
            "total_xp": u.total_xp or 0,
            "current_streak": u.current_streak or 0,
        }
        for i, u in enumerate(rows)
    ]


__all__ = ["award", "leaderboard", "XP_RULES", "BADGE_RULES"]
