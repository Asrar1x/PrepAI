"""Admin / placement-officer API.

Endpoints:
  - GET  /admin/students
  - GET  /admin/analytics
  - GET  /admin/funnel
  - GET  /admin/readiness-matrix
  - POST /admin/companies/{slug}/activate   (flag a company drive)
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, get_db
from app.models import User
from app.services import admin_analytics_service

router = APIRouter()


# ---------------------------------------------------------------------------
# Role gate
# ---------------------------------------------------------------------------


def _user_role(user: User) -> str:
    """Best-effort role lookup.  The User model stores ``role`` as a free-form
    column on some seeders, otherwise we fall back to email-based bootstrap
    for the very first user.
    """
    explicit = getattr(user, "role", None)
    if explicit:
        return explicit
    # Bootstrap: first user is the admin.
    if user.email in {"admin@prep.ai", "admin@prepai.dev"}:
        return "admin"
    return "student"


async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    role = _user_role(current_user)
    if role not in {"admin", "placement_officer"}:
        raise HTTPException(status_code=403, detail="Admin or placement officer role required")
    return current_user


# ---------------------------------------------------------------------------
# Students
# ---------------------------------------------------------------------------


@router.get("/students")
async def get_all_students(
    search: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    q = select(User)
    if search:
        like = f"%{search.lower()}%"
        q = q.where(
            (User.email.ilike(like)) | (User.full_name.ilike(like))
        )
    q = q.order_by(User.created_at.desc()).offset(offset).limit(limit)
    users = (await db.execute(q)).scalars().all()
    return [
        {
            "id": str(u.id),
            "name": u.full_name or "Unknown",
            "email": u.email,
            "batch": u.batch,
            "branch": u.branch,
            "total_xp": u.total_xp or 0,
            "current_streak": u.current_streak or 0,
            "status": "Active" if (u.last_active and (datetime.now(timezone.utc) - u.last_active).days < 7) else "Inactive",
        }
        for u in users
    ]


# ---------------------------------------------------------------------------
# Analytics
# ---------------------------------------------------------------------------


@router.get("/analytics")
async def get_analytics(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    return {
        "overview": await admin_analytics_service.overview(db),
        "department_performance": await admin_analytics_service.department_performance(db),
        "skills_radar": await admin_analytics_service.skills_radar(db),
        "weekly_score_distribution": await admin_analytics_service.weekly_score_distribution(db),
    }


@router.get("/funnel")
async def get_funnel(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    return await admin_analytics_service.engagement_funnel(db)


@router.get("/readiness-matrix")
async def get_readiness_matrix(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    return await admin_analytics_service.readiness_matrix(db)


# ---------------------------------------------------------------------------
# Company drive activation
# ---------------------------------------------------------------------------


class CompanyActivateRequest(BaseModel):
    target_roles: List[str] = []
    start_date: Optional[str] = None
    end_date: Optional[str] = None


@router.post("/companies/{slug}/activate")
async def activate_company_drive(
    slug: str,
    request: CompanyActivateRequest,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Flag a company drive.  Today this is recorded in an in-memory log and
    fires an admin_broadcast notification to every active user.
    """
    from app.models import User
    from app.services import notification_dispatcher

    users = (await db.execute(select(User).where(User.is_active == True))).scalars().all()
    sent = 0
    for u in users:
        try:
            await notification_dispatcher.dispatch(
                db=db,
                user=u,
                trigger="company_drive_activated",
                payload={"company": slug, "title": f"{slug} drive is now active!"},
            )
            sent += 1
        except Exception:
            pass

    return {"company": slug, "notified": sent, "status": "activated"}
