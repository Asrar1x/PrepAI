"""Resume intelligence — extraction, Claude + local-model parsing, storage, AV.

Pipeline:
  1. PyMuPDF extracts raw text from the uploaded PDF.
  2. Optional ClamAV scan (mock-clean when CLAMAV_HOST is unset).
  3. Parse the resume.  Order of preference:
       a. Claude Sonnet 4.6 (highest quality when key is set)
       b. **Model 10** (local GPT-2 resume generator) when the user
          has a target role and projects, to polish bullet points
       c. Deterministic local fallback (always available)
  4. **Model 3** (SBERT) computes a role-fit score when ``target_role``
     is provided.
  5. The original file is pushed to Cloudflare R2 (S3-compatible) with
     a local-FS fallback for dev.
  6. A row is created in ``resumes`` with the parsed payload and the
     public file URL.
"""
from __future__ import annotations

import asyncio
import logging
import os
import uuid
from typing import Any, Dict, Optional

import fitz  # PyMuPDF
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.custom_models.model_manager import get_models
from app.ai.prompts.resume import local_fallback_parse, parse_resume_with_claude
from app.core.config import settings
from app.models.resume import Resume
from app.models.user import User
from app.services import av_service, storage_service

logger = logging.getLogger(__name__)


async def extract_text_from_pdf(file_path: str) -> str:
    def _extract() -> str:
        doc = fitz.open(file_path)
        return "\n".join(page.get_text() for page in doc)

    return await asyncio.to_thread(_extract)


def _aggregate_ats_score(parsed: Dict[str, Any]) -> int:
    six_dim = parsed.get("six_dimension_scores") or {}
    if not six_dim:
        return 0
    return round(sum(six_dim.values()) / max(1, len(six_dim)))


def _model10_polish_bullets(parsed: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """If the parsed resume contains project entries, ask Model 10 (resume
    GPT-2) to rewrite each one as an ATS-optimised bullet.  Mutates a
    copy and returns it; returns None if Model 10 is not loaded or no
    project is present."""
    projects = parsed.get("projects") or []
    if not projects:
        return None
    try:
        models = get_models()
        if models.resume_model is None:
            return None
        polished: list = []
        for p in projects:
            if isinstance(p, dict):
                name = p.get("name") or p.get("title") or ""
                tech = p.get("tech") or p.get("tech_stack") or ""
                outcome = p.get("outcome") or p.get("result") or ""
            else:
                name, tech, outcome = str(p), "", ""
            if not name:
                continue
            bullet = models.generate_resume_bullet(name, tech, outcome)
            if bullet:
                polished.append({"project": name, "bullet": bullet})
        if not polished:
            return None
        out = dict(parsed)
        out["polished_bullets"] = polished
        out["source"] = (out.get("source") or "") + "+model10_resume_gpt2"
        return out
    except Exception as e:  # pragma: no cover - ML path
        logger.debug("Model 10 polish failed: %s", e)
        return None


def _model3_role_fit(parsed: Dict[str, Any], target_role: str) -> Optional[float]:
    """Score 0..1 of how well the parsed resume matches a target role
    using Model 3 (SBERT) cosine similarity."""
    try:
        models = get_models()
        if models.sbert_model is None:
            return None
        skills_text = " ".join(parsed.get("skills") or [])
        if not skills_text:
            return None
        return models.compute_relevance(skills_text, target_role)
    except Exception as e:  # pragma: no cover
        logger.debug("Model 3 role fit failed: %s", e)
        return None


async def process_uploaded_resume(
    file_path: str,
    filename: str,
    db: AsyncSession,
    user: User,
    target_role: Optional[str] = None,
) -> Resume:
    """End-to-end resume upload pipeline."""
    # 1. AV scan
    clean, av_msg = av_service.scan_file(file_path)
    if not clean:
        raise ValueError(f"Upload rejected by AV scanner: {av_msg}")

    # 2. Extract text
    text = await extract_text_from_pdf(file_path)

    # 3. Claude or local parse
    parsed = await parse_resume_with_claude(
        resume_text=text,
        api_key=settings.CLAUDE_API_KEY,
        target_role=target_role,
    )
    if parsed is None:
        parsed = local_fallback_parse(text)
        parsed.setdefault("source", "local-fallback")
    else:
        parsed["source"] = "claude-sonnet-4.6"

    ats = _aggregate_ats_score(parsed)

    # 3a. Model 10 — polish bullets (only when projects were extracted)
    polished = _model10_polish_bullets(parsed)
    if polished:
        parsed = polished

    # 3b. Model 3 — role-fit score when the user told us what they want.
    role_fit: Optional[float] = None
    if target_role:
        role_fit = _model3_role_fit(parsed, target_role)

    # 4. Upload to R2 (or local fallback)
    safe_name = filename.replace("..", "_").replace("/", "_")
    key = f"resumes/{user.id}/{uuid.uuid4()}_{safe_name}"
    public_url = storage_service.put_object(file_path, key)

    # 5. Persist
    resume = Resume(
        id=uuid.uuid4(),
        user_id=user.id,
        filename=filename,
        file_url=public_url,
        parsed_data=parsed,
        feedback_report={
            "strengths": [
                f"Strong in {k.replace('_', ' ')}"
                for k, v in (parsed.get("six_dimension_scores") or {}).items()
                if isinstance(v, (int, float)) and v >= 70
            ],
            "weaknesses": [
                f"Improve {k.replace('_', ' ')}"
                for k, v in (parsed.get("six_dimension_scores") or {}).items()
                if isinstance(v, (int, float)) and v < 60
            ],
            "ats_optimization_tips": parsed.get("improvement_tips", []),
            "role_fit_score": role_fit,
            "polished_bullets": parsed.get("polished_bullets"),
        },
        ats_score=f"{ats}/100",
    )
    db.add(resume)
    await db.commit()
    await db.refresh(resume)
    logger.info("resume %s parsed source=%s ats=%d", resume.id, parsed["source"], ats)
    return resume


__all__ = [
    "extract_text_from_pdf",
    "process_uploaded_resume",
    "local_fallback_parse",
]
