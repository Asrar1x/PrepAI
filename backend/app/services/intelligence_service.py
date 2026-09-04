"""Role & Company Intelligence Engine — Module 1.

Loads role + company data from JSON seeds; serves it through the API; and
calls Claude Haiku 4.5 to generate a personalized 30-day study plan from a
student's self-rated skill matrix.
"""
from __future__ import annotations

import json
import logging
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.models.role import Role, CompanyPattern
from app.models.study_plan import StudyPlan

logger = logging.getLogger(__name__)

SEEDS_DIR = Path(__file__).resolve().parent.parent / "seeds"


def _load_seed(filename: str) -> List[Dict[str, Any]]:
    path = SEEDS_DIR / filename
    if not path.exists():
        return []
    return json.loads(path.read_text(encoding="utf-8"))


async def seed_roles_and_companies(db: AsyncSession) -> Dict[str, int]:
    """Upsert roles and company patterns from JSON seeds. Idempotent."""
    roles_seed = _load_seed("roles.json")
    companies_seed = _load_seed("companies.json")

    # Roles
    inserted_roles = 0
    for r in roles_seed:
        existing = (await db.execute(select(Role).where(Role.slug == r["slug"]))).scalars().first()
        if existing:
            for k, v in r.items():
                setattr(existing, k, v)
            existing.updated_at = datetime.now(timezone.utc)
        else:
            db.add(Role(id=uuid.uuid4(), updated_at=datetime.now(timezone.utc), **r))
            inserted_roles += 1

    # Companies
    inserted_companies = 0
    for c in companies_seed:
        existing = (
            await db.execute(select(CompanyPattern).where(CompanyPattern.slug == c["slug"]))
        ).scalars().first()
        if existing:
            for k, v in c.items():
                setattr(existing, k, v)
            existing.updated_at = datetime.now(timezone.utc)
        else:
            db.add(CompanyPattern(id=uuid.uuid4(), updated_at=datetime.now(timezone.utc), **c))
            inserted_companies += 1

    await db.commit()
    return {"roles": inserted_roles, "companies": inserted_companies}


async def list_roles(db: AsyncSession, category: Optional[str] = None) -> List[Role]:
    q = select(Role).where(Role.is_active.is_(True))
    if category:
        q = q.where(Role.category == category)
    result = await db.execute(q.order_by(Role.title))
    return list(result.scalars().all())


async def list_companies(db: AsyncSession, hiring_signal: Optional[str] = None) -> List[CompanyPattern]:
    q = select(CompanyPattern).where(CompanyPattern.is_active.is_(True))
    if hiring_signal:
        q = q.where(CompanyPattern.hiring_signal == hiring_signal)
    result = await db.execute(q.order_by(CompanyPattern.name))
    return list(result.scalars().all())


async def get_company_pattern(db: AsyncSession, slug: str) -> Optional[CompanyPattern]:
    return (
        await db.execute(select(CompanyPattern).where(CompanyPattern.slug == slug))
    ).scalars().first()


async def get_role(db: AsyncSession, slug: str) -> Optional[Role]:
    return (await db.execute(select(Role).where(Role.slug == slug))).scalars().first()


# ----------------------------------------------------------------------
# Skill-gap → study plan
# ----------------------------------------------------------------------

STUDY_PLAN_SYSTEM = """You are an expert placement preparation mentor for Indian engineering students.
Given a target role, target company, and a student's self-rated skill matrix (Strong/Okay/Weak/Not Learned),
generate a 30-day structured study plan that maximizes the student's chance of clearing the company
selection process. Output STRICT JSON.
"""

STUDY_PLAN_USER_TEMPLATE = """Target role: {role_title}
Target company: {company_name}
Role required skills: {skills}

Student self-rating (skill -> rating):
{ratings_block}

Generate a 30-day plan. For each day include:
- day: integer 1..30
- title: short string
- focus_area: 1-2 word category
- estimated_minutes: integer (60-180)
- tasks: list of 3-5 specific, actionable tasks (not generic)
- resources: list of {{"title": str, "url": str}} (use real public resources: GeeksforGeeks, LeetCode, W3Schools, official docs)

Also include:
- role_specific_tips: 2-3 sentences tailored to {company_name} interview style
- weekly_milestones: list of 4 strings (one per week)
- estimated_readiness_pct: integer 0-100 the student will reach after completing the plan

Output JSON object with keys: days (array), role_specific_tips, weekly_milestones, estimated_readiness_pct.
"""


async def generate_study_plan(
    db: AsyncSession,
    user_id: uuid.UUID,
    role_slug: str,
    company_slug: Optional[str],
    ratings: Dict[str, str],
) -> StudyPlan:
    role = await get_role(db, role_slug)
    if not role:
        raise ValueError(f"Unknown role: {role_slug}")
    company = (
        await get_company_pattern(db, company_slug) if company_slug else None
    )

    skills_list = role.skills or []
    # Build ratings block
    if not ratings:
        ratings = {s: "okay" for s in skills_list}
    ratings_block = "\n".join(f"- {s}: {ratings.get(s, 'okay')}" for s in skills_list)

    plan_data: Dict[str, Any]
    if settings.CLAUDE_API_KEY:
        try:
            import anthropic

            client = anthropic.AsyncAnthropic(api_key=settings.CLAUDE_API_KEY)
            prompt = STUDY_PLAN_USER_TEMPLATE.format(
                role_title=role.title,
                company_name=company.name if company else "Top Tech",
                skills=skills_list,
                ratings_block=ratings_block,
            )
            response = await client.messages.create(
                model=settings.CLAUDE_MODEL_FAST,
                max_tokens=4096,
                system=STUDY_PLAN_SYSTEM,
                messages=[{"role": "user", "content": prompt}],
            )
            text = response.content[0].text
            # Try to parse JSON out of the response
            plan_data = _extract_json(text)
        except Exception as e:
            logger.warning("Claude study-plan call failed, falling back: %s", e)
            plan_data = _fallback_study_plan(role, company, ratings)
    else:
        plan_data = _fallback_study_plan(role, company, ratings)

    plan = StudyPlan(
        id=uuid.uuid4(),
        user_id=user_id,
        role_slug=role_slug,
        company_slug=company_slug,
        plan=plan_data,
        progress=0.0,
    )
    db.add(plan)
    await db.commit()
    await db.refresh(plan)
    return plan


def _extract_json(text: str) -> Dict[str, Any]:
    """Best-effort JSON extraction from a model response."""
    text = text.strip()
    # Strip ```json ... ``` fences if present
    if text.startswith("```"):
        text = text.strip("`")
        if text.startswith("json"):
            text = text[4:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()
    return json.loads(text)


def _fallback_study_plan(role: Role, company: Optional[CompanyPattern], ratings: Dict[str, str]) -> Dict[str, Any]:
    """Deterministic plan when no AI provider is configured."""
    skills = role.skills or ["DSA", "Communication", "Projects"]
    weak = [s for s, r in ratings.items() if r in {"weak", "not_learned"}] or skills[:2]
    days: List[Dict[str, Any]] = []
    for i in range(1, 31):
        skill = weak[i % len(weak)]
        days.append({
            "day": i,
            "title": f"{skill} practice",
            "focus_area": skill,
            "estimated_minutes": 90,
            "tasks": [
                f"Read 1 chapter/article on {skill}",
                f"Solve 2 practice problems on {skill}",
                f"Revise previous day's notes for 15 minutes",
            ],
            "resources": [
                {"title": f"{skill} — GeeksforGeeks", "url": "https://www.geeksforgeeks.org/"},
                {"title": f"{skill} — LeetCode", "url": "https://leetcode.com/"},
            ],
        })
    return {
        "days": days,
        "role_specific_tips": f"For {company.name if company else 'top companies'}, focus heavily on {skills[0] if skills else 'core fundamentals'}.",
        "weekly_milestones": [
            f"Cover {weak[0] if weak else 'fundamentals'} basics",
            f"Begin {weak[1] if len(weak) > 1 else 'mixed practice'}",
            "Mock interviews twice",
            "Company-pattern timed practice",
        ],
        "estimated_readiness_pct": 70,
    }
