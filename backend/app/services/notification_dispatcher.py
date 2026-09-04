"""Notification dispatcher — fans out a trigger to the right channels.

Trigger surface (per doc §19.5):
  - interview_ready
  - daily_practice
  - weak_topic_alert
  - streak_at_risk
  - company_drive_activated
  - weekly_digest
  - admin_broadcast

Each user has a notification_prefs JSONB column that controls which channels
they receive.  Channels: email (Resend), whatsapp (Meta Cloud), in_app (DB).
"""
from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification, UserNotificationPref
from app.models.user import User
from app.services import resend_service, whatsapp_service

logger = logging.getLogger(__name__)


DEFAULT_PREFS: Dict[str, Any] = {
    "email": True,
    "whatsapp": False,
    "in_app": True,
}


async def _load_prefs(db: AsyncSession, user_id) -> Dict[str, Any]:
    row = (
        await db.execute(
            select(UserNotificationPref).where(UserNotificationPref.user_id == user_id)
        )
    ).scalars().first()
    if row and row.prefs:
        merged = {**DEFAULT_PREFS, **(row.prefs or {})}
        return merged
    return dict(DEFAULT_PREFS)


async def _send_in_app(
    db: AsyncSession,
    user_id,
    trigger: str,
    payload: Dict[str, Any],
) -> None:
    subject = _subject_for_trigger(trigger, payload)
    n = Notification(
        user_id=user_id,
        type=trigger,
        category=payload.get("category", "system"),
        title=subject,
        body=payload.get("body") or subject,
        payload=payload,
        href=payload.get("href"),
    )
    db.add(n)
    await db.flush()


async def dispatch(
    db: AsyncSession,
    user: User,
    trigger: str,
    payload: Dict[str, Any],
) -> Dict[str, bool]:
    """Fan out one trigger to the channels the user has enabled."""
    prefs = await _load_prefs(db, user.id)
    sent: Dict[str, bool] = {}

    # 1. in-app
    if prefs.get("in_app", True):
        try:
            await _send_in_app(db, user.id, trigger, payload)
            sent["in_app"] = True
        except Exception as e:
            logger.warning("in-app notification failed: %s", e)
            sent["in_app"] = False

    # 2. email
    if prefs.get("email", True):
        subject, html = _render_email(trigger, user, payload)
        sent["email"] = resend_service.send_email(user.email, subject, html)

    # 3. whatsapp
    if prefs.get("whatsapp", False) and getattr(user, "phone_e164", None):
        sent["whatsapp"] = whatsapp_service.send_text(
            user.phone_e164, _render_whatsapp(trigger, user, payload)
        )

    await db.commit()
    return sent


def dispatch_sync(user: User, trigger: str, payload: Dict[str, Any]) -> Dict[str, bool]:
    """Sync variant for Celery tasks. Skips in-app DB writes (those are
    typically done by an API call), but does email + whatsapp fan-out.
    Returns a {channel: bool} map.
    """
    sent: Dict[str, bool] = {}

    subject, html = _render_email(trigger, user, payload)
    sent["email"] = resend_service.send_email(user.email, subject, html)

    if getattr(user, "phone_e164", None):
        sent["whatsapp"] = whatsapp_service.send_text(
            user.phone_e164, _render_whatsapp(trigger, user, payload)
        )
    return sent


# ----------------------------------------------------------------------
# Templates
# ----------------------------------------------------------------------


def _subject_for_trigger(trigger: str, payload: Dict[str, Any]) -> str:
    if trigger == "daily_practice":
        return "Your daily practice is ready"
    if trigger == "streak_at_risk":
        return "Don't break your streak!"
    if trigger == "weak_topic_alert":
        return f"Focus on: {payload.get('topic', 'your weak topic')}"
    if trigger == "interview_ready":
        return "Your interview feedback report is ready"
    if trigger == "company_drive_activated":
        return f"{payload.get('company', 'A company')} drive is now active"
    if trigger == "weekly_digest":
        return "Your weekly PrepAI digest"
    if trigger == "admin_broadcast":
        return payload.get("title", "PrepAI update")
    return "PrepAI update"


def _render_email(trigger: str, user: User, payload: Dict[str, Any]) -> tuple[str, str]:
    name = user.full_name or "there"
    if trigger == "daily_practice":
        return (
            "Your 20-question daily practice is ready",
            f"<p>Hi {name},</p><p>Your daily aptitude practice for "
            f"<b>{payload.get('company','your target company')}</b> is ready. "
            f"Open PrepAI to take it.</p>",
        )
    if trigger == "streak_at_risk":
        return (
            "Don't break your streak!",
            f"<p>Hi {name},</p><p>You have an active {payload.get('streak', 0)}-day streak. "
            f"Take a quick 5-minute practice to keep it going.</p>",
        )
    if trigger == "weak_topic_alert":
        return (
            f"Focus on: {payload.get('topic','your weak topic')}",
            f"<p>Hi {name},</p><p>You scored below 60% on "
            f"<b>{payload.get('topic','this topic')}</b>. We've prepared a focused set.</p>",
        )
    if trigger == "interview_ready":
        return (
            "Your interview feedback report is ready",
            f"<p>Hi {name},</p><p>Your detailed interview feedback is available: "
            f"<a href=\"{payload.get('report_url','#')}\">View report</a>.</p>",
        )
    if trigger == "company_drive_activated":
        return (
            f"{payload.get('company','A company')} drive is now active",
            f"<p>Hi {name},</p><p>{payload.get('company','A new company')} is now hiring. "
            f"Practice their assessment pattern now.</p>",
        )
    if trigger == "weekly_digest":
        return (
            "Your weekly PrepAI digest",
            f"<p>Hi {name},</p><p>Week summary: {payload.get('summary','')}</p>",
        )
    return (
        "PrepAI update",
        f"<p>Hi {name},</p><p>{trigger}: {payload}</p>",
    )


def _render_whatsapp(trigger: str, user: User, payload: Dict[str, Any]) -> str:
    if trigger == "daily_practice":
        return f"PrepAI: your 20-question daily practice is ready. Open the app to start."
    if trigger == "streak_at_risk":
        return f"PrepAI: you have a {payload.get('streak', 0)}-day streak at risk. Take 5 min to keep it!"
    if trigger == "interview_ready":
        return f"PrepAI: your interview feedback report is ready. {payload.get('report_url','')}"
    return f"PrepAI: {trigger}"
