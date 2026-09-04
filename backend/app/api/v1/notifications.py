"""In-app notifications API.

Endpoints:
  - GET    /notifications              list the current user's in-app notifications
  - GET    /notifications/unread-count
  - POST   /notifications/{id}/read    mark a single notification read
  - POST   /notifications/read-all     mark all read
  - GET    /notifications/prefs        get channel preferences
  - PUT    /notifications/prefs        update channel preferences
"""
from __future__ import annotations

import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, get_db
from app.models import User
from app.models.notification import Notification, UserNotificationPref

router = APIRouter()


@router.get("")
async def list_notifications(
    limit: int = 50,
    offset: int = 0,
    only_unread: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    q = select(Notification).where(Notification.user_id == current_user.id)
    if only_unread:
        q = q.where(Notification.read_at.is_(None))
    q = q.order_by(Notification.created_at.desc()).offset(offset).limit(limit)
    rows = (await db.execute(q)).scalars().all()
    return [
        {
            "id": str(n.id),
            "type": n.type,
            "category": n.category,
            "title": n.title,
            "body": n.body,
            "href": n.href,
            "payload": n.payload,
            "read_at": n.read_at.isoformat() if n.read_at else None,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        }
        for n in rows
    ]


@router.get("/unread-count")
async def unread_count(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, int]:
    from sqlalchemy import func
    count = (
        await db.execute(
            select(func.count(Notification.id)).where(
                Notification.user_id == current_user.id,
                Notification.read_at.is_(None),
            )
        )
    ).scalar_one()
    return {"unread": int(count or 0)}


@router.post("/{notification_id}/read")
async def mark_read(
    notification_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, str]:
    n = (
        await db.execute(
            select(Notification).where(
                Notification.id == notification_id,
                Notification.user_id == current_user.id,
            )
        )
    ).scalars().first()
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    from datetime import datetime, timezone
    n.read_at = datetime.now(timezone.utc)
    await db.commit()
    return {"status": "ok"}


@router.post("/read-all")
async def mark_all_read(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, int]:
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    res = await db.execute(
        update(Notification)
        .where(Notification.user_id == current_user.id, Notification.read_at.is_(None))
        .values(read_at=now)
    )
    await db.commit()
    return {"updated": res.rowcount or 0}


# ---------------------------------------------------------------------------
# Preferences
# ---------------------------------------------------------------------------


DEFAULT_PREFS: Dict[str, bool] = {"email": True, "whatsapp": False, "in_app": True}


class PrefsPayload(BaseModel):
    email: Optional[bool] = None
    whatsapp: Optional[bool] = None
    in_app: Optional[bool] = None


@router.get("/prefs")
async def get_prefs(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    row = (
        await db.execute(
            select(UserNotificationPref).where(
                UserNotificationPref.user_id == current_user.id
            )
        )
    ).scalars().first()
    prefs = (row.prefs or {}) if row else {}
    return {**DEFAULT_PREFS, **prefs}


@router.put("/prefs")
async def update_prefs(
    payload: PrefsPayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    row = (
        await db.execute(
            select(UserNotificationPref).where(
                UserNotificationPref.user_id == current_user.id
            )
        )
    ).scalars().first()
    if not row:
        row = UserNotificationPref(user_id=current_user.id, prefs={})
        db.add(row)
    new_prefs = {**(row.prefs or {}), **payload.model_dump(exclude_none=True)}
    row.prefs = new_prefs
    await db.commit()
    return {**DEFAULT_PREFS, **new_prefs}
