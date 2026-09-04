"""Prompts for the Claude-based resume parser.

Output schema is the 6-dimension ATS breakdown per doc §11.2:
  - keyword_relevance
  - section_completeness
  - quantified_achievements
  - action_verb_quality
  - machine_readability
  - length_density

Plus ``interview_hot_spots`` (5-8 items) for the voice agent.
"""
from __future__ import annotations

import json
import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


RESUME_PARSER_SYSTEM = (
    "You are a senior technical recruiter and ATS specialist. Given a resume, "
    "you return a strict JSON object only — no prose, no markdown fences."
)


RESUME_PARSER_USER_TEMPLATE = """Analyze the following resume and return a JSON object with EXACTLY these keys:

{{
  "name": "<candidate full name or empty string>",
  "email": "<email or empty string>",
  "phone": "<phone or empty string>",
  "skills": [<list of normalized skill tokens, e.g. "Python", "React">],
  "experience_years": <number, integer or 0>,
  "education": [<{{"institution": str, "degree": str, "year": str|int}}>],
  "projects": [<{{"name": str, "description": str, "tech": [str]}}>],
  "six_dimension_scores": {{
    "keyword_relevance": <0-100>,
    "section_completeness": <0-100>,
    "quantified_achievements": <0-100>,
    "action_verb_quality": <0-100>,
    "machine_readability": <0-100>,
    "length_density": <0-100>
  }},
  "interview_hot_spots": [<5-8 short strings, each a probing question anchor>],
  "improvement_tips": [<3-5 short strings>]
}}

Resume text (may be truncated):
\"\"\"
{resume_text}
\"\"\"
"""


def _safe_json(text: str) -> Optional[Dict[str, Any]]:
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1:
        return None
    try:
        return json.loads(text[start : end + 1])
    except json.JSONDecodeError:
        return None


async def parse_resume_with_claude(
    resume_text: str,
    api_key: Optional[str],
    target_role: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """Call Claude Sonnet 4.6 to extract the structured resume schema.

    Returns ``None`` when the API key is missing or the response is
    unparseable; the caller falls back to deterministic local analysis.
    """
    if not api_key:
        return None
    try:
        import anthropic

        client = anthropic.Anthropic(api_key=api_key)
        prompt = RESUME_PARSER_USER_TEMPLATE.format(resume_text=resume_text[:8000])
        if target_role:
            prompt += f"\nTarget role: {target_role}\n"

        msg = client.messages.create(
            model="claude-3-5-sonnet-latest",
            max_tokens=1500,
            system=RESUME_PARSER_SYSTEM,
            messages=[{"role": "user", "content": prompt}],
        )
        text = msg.content[0].text if msg.content else ""
        parsed = _safe_json(text)
        if parsed is None:
            logger.warning("Claude returned non-JSON for resume parse")
        return parsed
    except Exception as e:  # pragma: no cover
        logger.warning("Claude resume parse failed: %s", e)
        return None


def local_fallback_parse(resume_text: str) -> Dict[str, Any]:
    """Deterministic local fallback.  Produces a valid 6-dimension schema so
    the front-end always has a number to show.
    """
    lower = resume_text.lower()
    words = resume_text.split()
    word_count = len(words)

    skill_vocab = [
        "python", "java", "javascript", "typescript", "react", "node", "sql",
        "aws", "docker", "kubernetes", "machine learning", "fastapi", "django",
        "flask", "mongodb", "postgres", "redis", "tensorflow", "pytorch",
        "c++", "c#", "go", "rust", "kotlin", "swift", "azure", "gcp",
    ]
    skills = sorted({s.title() for s in skill_vocab if s in lower})

    sections = ["education", "experience", "project", "skill"]
    section_hits = sum(1 for s in sections if s in lower)
    quantified = sum(1 for tok in ["%", "percent", "reduced", "increased", "improved", "saved"] if tok in lower)
    action_verbs = ["built", "designed", "led", "implemented", "created", "optimized", "architected", "deployed"]
    action_hits = sum(1 for v in action_verbs if v in lower)

    six_dim = {
        "keyword_relevance": min(100, len(skills) * 12),
        "section_completeness": min(100, section_hits * 22),
        "quantified_achievements": min(100, quantified * 20),
        "action_verb_quality": min(100, action_hits * 14),
        "machine_readability": 80 if word_count > 200 else 50,
        "length_density": min(100, max(0, 60 - abs(500 - word_count) // 8)),
    }

    hot_spots: List[str] = []
    for s in skills[:5]:
        hot_spots.append(f"Deep dive on {s}: design decisions and trade-offs")
    if not hot_spots:
        hot_spots = ["Tell me about a project you led end-to-end."]

    return {
        "name": "",
        "email": "",
        "phone": "",
        "skills": skills,
        "experience_years": 0,
        "education": [],
        "projects": [],
        "six_dimension_scores": six_dim,
        "interview_hot_spots": hot_spots,
        "improvement_tips": [
            "Add quantified impact to each project (e.g. 'reduced latency 40%').",
            "Start bullets with strong action verbs (Architected, Optimized, Led).",
            "Group skills into categories (Languages, Frameworks, Cloud).",
        ],
    }
