"""Daily Celery tasks — daily practice, streak-at-risk, weekly digest.

Wired into Celery Beat via `app.core.celery_app.conf.beat_schedule` in
`celery_app.py`.  Run the worker with `celery -A app.core.celery_app worker`
and the scheduler with `celery -A app.core.celery_app beat`.
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.core.celery_app import celery_app
from app.core.database import get_sync_db
from app.models import DailyQuest, User
from app.models.aptitude import AptitudeSession
from app.services import notification_dispatcher

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.daily_tasks.daily_practice_scheduler")
def daily_practice_scheduler() -> dict:
    """Generate a daily practice quest for every active student."""
    counts = {"generated": 0, "sent": 0}
    session = get_sync_db()
    try:
        users = session.execute(select(User).where(User.is_active.is_(True))).scalars().all()
        today = datetime.now(timezone.utc).date()
        for u in users:
            # Skip if a quest already exists for today
            existing = session.execute(
                select(DailyQuest).where(
                    DailyQuest.user_id == u.id, DailyQuest.date == today
                )
            ).scalars().first()
            if existing:
                continue
            # Determine weak topics from last 7 days
            week_ago = datetime.now(timezone.utc) - timedelta(days=7)
            recent = session.execute(
                select(AptitudeSession).where(
                    AptitudeSession.user_id == u.id, AptitudeSession.created_at >= week_ago
                )
            ).scalars().all()
            weak: list[str] = []
            for s in recent:
                for w in (s.weak_topics or []):
                    if isinstance(w, dict) and w.get("category"):
                        weak.append(w["category"])
            quest = DailyQuest(
                id=uuid.uuid4(),
                user_id=u.id,
                date=today,
                metadata_json={"weak_focus": list(set(weak))[:3]},
                completed=False,
            )
            session.add(quest)
            counts["generated"] += 1
            # Notify
            company = (u.target_roles or ["your target company"])[0] if u.target_roles else "your target company"
            ok = notification_dispatcher.dispatch_sync(
                u,
                trigger="daily_practice",
                payload={"company": company, "weak": weak[:3]},
            )
            if ok.get("email") or ok.get("in_app"):
                counts["sent"] += 1
        session.commit()
    except Exception as e:
        logger.exception("daily_practice_scheduler failed: %s", e)
        session.rollback()
    finally:
        session.close()
    return counts


@celery_app.task(name="app.tasks.daily_tasks.streak_at_risk_check")
def streak_at_risk_check() -> dict:
    """Notify students whose streak ends today if they don't practice."""
    sent = 0
    session = get_sync_db()
    try:
        users = session.execute(select(User).where(User.current_streak > 0)).scalars().all()
        for u in users:
            last_active = getattr(u, "last_active_date", None)
            if not last_active:
                continue
            today = datetime.now(timezone.utc).date()
            if (today - last_active.date()).days >= 1:
                notification_dispatcher.dispatch_sync(
                    u,
                    trigger="streak_at_risk",
                    payload={"streak": u.current_streak},
                )
                sent += 1
        session.commit()
    except Exception as e:
        logger.exception("streak_at_risk_check failed: %s", e)
        session.rollback()
    finally:
        session.close()
    return {"sent": sent}


@celery_app.task(name="app.tasks.daily_tasks.weekly_digest")
def weekly_digest() -> dict:
    sent = 0
    session = get_sync_db()
    try:
        users = session.execute(select(User).where(User.is_active.is_(True))).scalars().all()
        week_ago = datetime.now(timezone.utc) - timedelta(days=7)
        for u in users:
            recent = session.execute(
                select(AptitudeSession).where(
                    AptitudeSession.user_id == u.id, AptitudeSession.created_at >= week_ago
                )
            ).scalars().all()
            sessions_n = len(recent)
            avg = (
                round(sum(s.score or 0 for s in recent) / sessions_n) if sessions_n else 0
            )
            notification_dispatcher.dispatch_sync(
                u,
                trigger="weekly_digest",
                payload={
                    "summary": f"{sessions_n} sessions, avg score {avg}%, "
                    f"current streak {u.current_streak}",
                },
            )
            sent += 1
        session.commit()
    except Exception as e:
        logger.exception("weekly_digest failed: %s", e)
        session.rollback()
    finally:
        session.close()
    return {"sent": sent}
