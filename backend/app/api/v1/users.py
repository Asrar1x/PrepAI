from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, get_db
from app.models import User
from app.models.aptitude import AptitudeSession
from app.models.interview import InterviewSession
from app.schemas.common import APIResponse
from app.schemas.user import UserResponse
from app.services import analytics_service, gamification_service

router = APIRouter()


@router.get("/me", response_model=APIResponse[UserResponse])
async def get_me(current_user: User = Depends(get_current_user)):
    return APIResponse(status="success", message="Current user details", data=current_user)


class XPRequest(BaseModel):
    points: int
    event: Optional[str] = None  # if set, route through gamification_service.award


@router.put("/me/xp")
async def add_xp(
    request: XPRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if request.event:
        new_total = await gamification_service.award(db, current_user, request.event)
    else:
        current_user.total_xp = (current_user.total_xp or 0) + request.points
        new_total = current_user.total_xp
    await db.commit()
    return APIResponse(
        status="success",
        message="XP updated",
        data={"total_xp": new_total, "streak": current_user.current_streak or 0},
    )


@router.get("/me/activity")
async def get_activity(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    activities = []

    res_int = await db.execute(
        select(InterviewSession)
        .where(InterviewSession.user_id == current_user.id)
        .order_by(InterviewSession.started_at.desc())
        .limit(5)
    )
    for session in res_int.scalars().all():
        score = int(session.overall_score) if session.overall_score else 0
        status = "Excellent" if score > 80 else "Good" if score > 60 else "Needs Improvement"
        activities.append({
            "id": str(session.id),
            "title": f"{session.interview_type.capitalize()} Interview - {session.job_role}",
            "score": score,
            "type": "mock",
            "date": session.started_at.strftime("%b %d, %Y") if session.started_at else "Unknown",
            "status": status,
            "timestamp": session.started_at,
        })

    res_apt = await db.execute(
        select(AptitudeSession)
        .where(AptitudeSession.user_id == current_user.id)
        .order_by(AptitudeSession.created_at.desc())
        .limit(5)
    )
    for session in res_apt.scalars().all():
        score = int(session.score) if session.score else 0
        status = "Excellent" if score > 80 else "Good" if score > 60 else "Needs Improvement"
        activities.append({
            "id": str(session.id),
            "title": f"Aptitude Test - {session.job_role}",
            "score": score,
            "type": "aptitude",
            "date": session.created_at.strftime("%b %d, %Y") if session.created_at else "Unknown",
            "status": status,
            "timestamp": session.created_at,
        })

    activities.sort(key=lambda x: x["timestamp"] or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
    for a in activities:
        a.pop("timestamp", None)
    return APIResponse(status="success", message="User activity", data=activities[:5])


@router.get("/me/dashboard")
async def get_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    payload = await analytics_service.build_dashboard(db, current_user)
    return APIResponse(status="success", message="Dashboard data", data=payload)


@router.get("/me/company-readiness")
async def get_company_readiness(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = await analytics_service.company_readiness(db, current_user)
    return APIResponse(status="success", message="Company readiness", data=rows)


@router.get("/leaderboard")
async def get_leaderboard(
    scope: str = Query("all", pattern="^(all|week|month)$"),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = await gamification_service.leaderboard(db, scope=scope, limit=limit)
    return APIResponse(status="success", message="Leaderboard", data=rows)


@router.get("/me/badges")
async def get_my_badges(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.models import Badge, UserBadge
    rows = (
        await db.execute(
            select(Badge, UserBadge.awarded_at)
            .join(UserBadge, UserBadge.badge_id == Badge.id)
            .where(UserBadge.user_id == current_user.id)
            .order_by(UserBadge.awarded_at.desc())
        )
    ).all()
    data = [
        {
            "slug": b.slug,
            "title": b.title,
            "description": b.description,
            "awarded_at": awarded.isoformat() if awarded else None,
        }
        for b, awarded in rows
    ]
    return APIResponse(status="success", message="My badges", data=data)
