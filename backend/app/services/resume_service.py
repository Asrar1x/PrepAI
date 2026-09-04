"""Resume intelligence — extraction, Claude-based parsing, storage, AV.

Pipeline:
  1. PyMuPDF extracts raw text from the uploaded PDF.
  2. Optional ClamAV scan (mock-clean when CLAMAV_HOST is unset).
  3. Claude Sonnet 4.6 returns a structured 6-dimension ATS breakdown plus
     5-8 interview hot-spots.  Falls back to a deterministic local parse
     when the API key is missing.
  4. The original file is pushed to Cloudflare R2 (S3-compatible) with a
     local-FS fallback for dev.
  5. A row is created in ``resumes`` with the parsed payload and the
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
