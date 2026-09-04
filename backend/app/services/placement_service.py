"""Model 9 — Placement Probability Predictor (XGBoost per company).

Computes the per-company probability of placement for a student
given their current PrepAI signals.  Falls back to the doc-locked
heuristic when the XGBoost model is not yet trained.

Inputs (17 features, see train script for full list):
  technical_score, communication_score, problem_solving_score,
  resume_score, total_xp, current_streak, mock_interview_count,
  company_drive_active, branch_cse, branch_ece, branch_me,
  batch_2026, has_internship, projects_count, certifications_count,
  avg_response_latency_ms, last_30d_active_days

We compute most of these from the existing User row + the latest
interview scoring payload; the caller passes the rest.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.custom_models.model_manager import get_models
from app.models.user import User

logger = logging.getLogger(__name__)

COMPANIES = [
    "tcs", "infosys", "wipro", "zoho", "amazon", "accenture",
    "cognizant", "hcl", "capgemini", "freshworks", "hexaware", "ltinfotech",
]


def _branch_one_hot(branch: Optional[str]) -> Dict[str, int]:
    branch = (branch or "").lower()
    return {
        "branch_cse": int(branch in {"cse", "cs", "computer science"}),
        "branch_ece": int(branch in {"ece", "electronics", "e&c"}),
        "branch_me":  int(branch in {"me", "mechanical", "mech"}),
    }


async def _latest_dimension_scores(db: AsyncSession, user: User) -> Dict[str, float]:
    """Best-effort: read the user's most recent interview scoring."""
    try:
        from sqlalchemy import select
        from app.models.interview import InterviewSession
        r = await db.execute(
            select(InterviewSession)
            .where(InterviewSession.user_id == user.id, InterviewSession.score_breakdown.isnot(None))
            .order_by(InterviewSession.created_at.desc())
            .limit(1)
        )
        sess = r.scalars().first()
        if sess and sess.score_breakdown:
            dims = sess.score_breakdown.get("dimensions") or {}
            return {
                "technical_score": float(dims.get("technical_knowledge", {}).get("score", 0)),
                "communication_score": float(dims.get("communication", {}).get("score", 0)),
                "problem_solving_score": float(dims.get("depth", {}).get("score", 0)),
            }
    except Exception as e:  # pragma: no cover
        logger.debug("latest_dim_scores lookup failed: %s", e)
    return {"technical_score": 0.0, "communication_score": 0.0, "problem_solving_score": 0.0}


async def student_features(
    db: AsyncSession, user: User, resume_score: float = 0.0
) -> Dict[str, float]:
    dims = await _latest_dimension_scores(db, user)
    branch = _branch_one_hot(getattr(user, "branch", None))
    return {
        "technical_score":       dims.get("technical_score", 0.0),
        "communication_score":   dims.get("communication_score", 0.0),
        "problem_solving_score": dims.get("problem_solving_score", 0.0),
        "resume_score":          float(resume_score),
        "total_xp":              float(getattr(user, "total_xp", 0) or 0),
        "current_streak":        float(getattr(user, "current_streak", 0) or 0),
        "mock_interview_count":  float(getattr(user, "total_sessions", 0) or 0),
        "company_drive_active":  0.0,
        "branch_cse":            float(branch["branch_cse"]),
        "branch_ece":            float(branch["branch_ece"]),
        "branch_me":             float(branch["branch_me"]),
        "batch_2026":            1.0,
        "has_internship":        0.0,
        "projects_count":        0.0,
        "certifications_count":  0.0,
        "avg_response_latency_ms": 0.0,
        "last_30d_active_days":  0.0,
    }


async def predict_for_all_companies(
    db: AsyncSession, user: User, resume_score: float = 0.0,
) -> List[Dict[str, Any]]:
    feats = await student_features(db, user, resume_score=resume_score)
    models = get_models()
    out = []
    for slug in COMPANIES:
        out.append(models.predict_placement(slug, feats))
    out.sort(key=lambda r: -r["probability"])
    return out


__all__ = ["COMPANIES", "student_features", "predict_for_all_companies"]
