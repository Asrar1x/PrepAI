"""Seven-dimension interview scoring (PrepAI doc §10.2).

The seven dimensions:
  1. technical_knowledge
  2. communication
  3. confidence
  4. relevance
  5. depth
  6. star_compliance       (only meaningful for behavioral / hr / resume)
  7. question_coverage

Heuristics-first design: pure-Python text analysis on the transcript
produces deterministic per-dimension scores 0-100.  When the custom
models are loaded (``app.ai.custom_models.model_manager``), the
following dimensions are upgraded:
  - technical_knowledge  → Model 1 (BERT) average quality label
  - relevance            → Model 3 (SBERT) average cosine
  - confidence           → Model 12 (anxiety formula) inverse signal

A final Claude Sonnet 4.6 call (when ``CLAUDE_API_KEY`` is set) rewrites
the qualitative strengths/improvements/next_steps.
"""
from __future__ import annotations

import logging
import re
import statistics
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Sequence

from app.ai.custom_models.model_manager import get_models

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# 7 dimensions (doc §10.2)
# ---------------------------------------------------------------------------

DIMENSIONS: List[str] = [
    "technical_knowledge",
    "communication",
    "confidence",
    "relevance",
    "depth",
    "star_compliance",
    "question_coverage",
]


STAR_KEYWORDS = {
    "situation": re.compile(r"\b(situation|context|background|when|where)\b", re.I),
    "task": re.compile(r"\b(goal|objective|needed|had to|responsible|task)\b", re.I),
    "action": re.compile(r"\b(i |i'|we |i did|i built|i designed|i led|i implemented|i created|developed|created|led|designed|built)\b", re.I),
    "result": re.compile(r"\b(result|outcome|impact|metric|percent|%|reduced|increased|improved|won|delivered)\b", re.I),
}


FILLER_PATTERNS = [
    re.compile(r"\b(um+|uh+|er+|ah+|like,?|you know,?|sort of,?|kind of,?|i mean,?)\b", re.I),
]


# ---------------------------------------------------------------------------
# Dataclass
# ---------------------------------------------------------------------------


@dataclass
class DimensionScore:
    name: str
    score: float  # 0-100
    notes: str = ""


# ---------------------------------------------------------------------------
# Per-dimension heuristics
# ---------------------------------------------------------------------------


def _candidate_turns(transcript: Sequence[Dict[str, Any]]) -> List[str]:
    """Return only the candidate's spoken lines."""
    out: List[str] = []
    for turn in transcript or []:
        speaker = (turn.get("speaker") or turn.get("role") or "").lower()
        if speaker in {"candidate", "user", "you"}:
            text = (turn.get("text") or turn.get("content") or "").strip()
            if text:
                out.append(text)
    return out


def _interviewer_turns(transcript: Sequence[Dict[str, Any]]) -> List[str]:
    out: List[str] = []
    for turn in transcript or []:
        speaker = (turn.get("speaker") or turn.get("role") or "").lower()
        if speaker in {"interviewer", "ai", "assistant"}:
            text = (turn.get("text") or turn.get("content") or "").strip()
            if text:
                out.append(text)
    return out


def _filler_ratio(text: str) -> float:
    words = re.findall(r"\b\w+\b", text)
    if not words:
        return 0.0
    filler = 0
    for pat in FILLER_PATTERNS:
        filler += len(pat.findall(text))
    return min(1.0, filler / max(1, len(words) // 4))


def _avg_turn_length(turns: Sequence[str]) -> float:
    lengths = [len(re.findall(r"\b\w+\b", t)) for t in turns if t.strip()]
    return statistics.mean(lengths) if lengths else 0.0


def _lexical_diversity(turns: Sequence[str]) -> float:
    all_words: List[str] = []
    for t in turns:
        all_words.extend(w.lower() for w in re.findall(r"\b\w+\b", t))
    if not all_words:
        return 0.0
    return len(set(all_words)) / len(all_words)


def _score_technical_knowledge(turns: Sequence[str], interview_type: str) -> DimensionScore:
    """Uses Model 1 (BERT answer quality) when available, falling back to
    the lexical heuristic.  Behavioral interviews default to neutral.
    """
    if interview_type not in {"technical", "case"}:
        return DimensionScore("technical_knowledge", 70.0, "Not assessed for this interview type.")
    if not turns:
        return DimensionScore("technical_knowledge", 0.0, "No candidate answers recorded.")

    # Try Model 1 (BERT) — average the per-turn quality score across all turns.
    try:
        models = get_models()
        if models.bert_model is not None and interview_type == "technical":
            scores: List[float] = []
            for t in turns:
                r = models.classify_answer(question="(technical)", answer=t)
                label_id = r.get("label_id", 2)
                conf = float(r.get("confidence", 0.5))
                # 0..3 → 0..100 weight by confidence
                scores.append((label_id / 3.0) * 100.0 * conf + 100.0 * (1.0 - conf) * 0.5)
            if scores:
                avg = sum(scores) / len(scores)
                return DimensionScore(
                    "technical_knowledge",
                    round(avg, 1),
                    f"Model 1 BERT avg across {len(scores)} turns; "
                    f"source={scores and 'model1_bert'}",
                )
    except Exception as e:  # pragma: no cover - ML path
        logger.debug("Model 1 technical scoring fell back: %s", e)

    # Heuristic fallback: longer, more lexically diverse answers score higher.
    avg_len = _avg_turn_length(turns)
    diversity = _lexical_diversity(turns)
    score = min(100.0, avg_len * 1.5 + diversity * 60)
    return DimensionScore(
        "technical_knowledge",
        round(score, 1),
        f"avg {avg_len:.1f} words/turn, lexical diversity {diversity:.2f}",
    )


def _score_communication(turns: Sequence[str]) -> DimensionScore:
    if not turns:
        return DimensionScore("communication", 0.0, "No candidate answers recorded.")
    avg_len = _avg_turn_length(turns)
    filler = statistics.mean(_filler_ratio(t) for t in turns) if turns else 0.0
    # Ideal: ~80 words/turn, low filler.
    length_score = max(0.0, 100.0 - abs(avg_len - 80) * 0.6)
    filler_penalty = filler * 60
    score = max(0.0, min(100.0, length_score - filler_penalty))
    return DimensionScore(
        "communication",
        round(score, 1),
        f"avg {avg_len:.1f} words/turn, filler ratio {filler:.2f}",
    )


def _score_confidence(turns: Sequence[str]) -> DimensionScore:
    if not turns:
        return DimensionScore("confidence", 0.0, "No candidate answers recorded.")
    hedge_pat = re.compile(r"\b(maybe|i think|i guess|i'm not sure|kind of|sort of|possibly)\b", re.I)
    hedges = sum(len(hedge_pat.findall(t)) for t in turns)
    total_words = sum(len(re.findall(r"\b\w+\b", t)) for t in turns) or 1
    hedge_ratio = hedges / total_words
    avg_len = _avg_turn_length(turns)
    score = max(0.0, min(100.0, 60 + avg_len * 0.5 - hedge_ratio * 2000))
    return DimensionScore(
        "confidence",
        round(score, 1),
        f"avg {avg_len:.1f} words/turn, hedge ratio {hedge_ratio:.3f}",
    )


def _score_relevance(candidate_turns: Sequence[str], interviewer_turns: Sequence[str]) -> DimensionScore:
    if not candidate_turns or not interviewer_turns:
        return DimensionScore("relevance", 50.0, "Insufficient data to score relevance.")

    # Try Model 3 (SBERT) — semantic similarity averaged per interviewer question.
    try:
        models = get_models()
        if models.sbert_model is not None:
            sims: List[float] = []
            for q in interviewer_turns:
                # take the closest candidate turn to this question
                best = 0.0
                for a in candidate_turns:
                    s = models.compute_relevance(q, a)
                    if s > best:
                        best = s
                sims.append(best)
            avg = sum(sims) / len(sims) if sims else 0.5
            return DimensionScore(
                "relevance",
                round(avg * 100.0, 1),
                f"Model 3 SBERT avg cosine {avg:.3f} across {len(sims)} turns",
            )
    except Exception as e:  # pragma: no cover
        logger.debug("Model 3 relevance scoring fell back: %s", e)

    # Lexical fallback
    cand_words = {w.lower() for t in candidate_turns for w in re.findall(r"\b\w+\b", t)}
    int_words = {w.lower() for t in interviewer_turns for w in re.findall(r"\b\w+\b", t)}
    if not cand_words or not int_words:
        return DimensionScore("relevance", 50.0, "Insufficient vocabulary overlap.")
    overlap = len(cand_words & int_words) / max(1, len(int_words))
    score = min(100.0, 50.0 + overlap * 200)
    return DimensionScore(
        "relevance",
        round(score, 1),
        f"lexical overlap with interviewer: {overlap:.2f}",
    )


def _score_depth(turns: Sequence[str]) -> DimensionScore:
    if not turns:
        return DimensionScore("depth", 0.0, "No candidate answers recorded.")
    # Depth proxy: longest answer and number of multi-sentence answers.
    longest = max((len(re.findall(r"\b\w+\b", t)) for t in turns), default=0)
    multi_sentence = sum(1 for t in turns if len(re.split(r"[.!?]+", t)) >= 3)
    score = min(100.0, longest * 0.6 + multi_sentence * 8)
    return DimensionScore(
        "depth",
        round(score, 1),
        f"longest turn {longest} words, multi-sentence turns {multi_sentence}",
    )


def _score_star(turns: Sequence[str], interview_type: str) -> DimensionScore:
    if interview_type not in {"behavioral", "hr", "resume"}:
        return DimensionScore("star_compliance", 70.0, "Not assessed for this interview type.")
    if not turns:
        return DimensionScore("star_compliance", 0.0, "No candidate answers recorded.")
    hits: Dict[str, int] = {k: 0 for k in STAR_KEYWORDS}
    for t in turns:
        for k, pat in STAR_KEYWORDS.items():
            if pat.search(t):
                hits[k] += 1
    covered = sum(1 for v in hits.values() if v > 0)
    score = covered / 4.0 * 100.0
    return DimensionScore(
        "star_compliance",
        round(score, 1),
        f"covered {covered}/4 STAR components (S={hits['situation']}, T={hits['task']}, A={hits['action']}, R={hits['result']})",
    )


def _score_coverage(candidate_turns: Sequence[str], interviewer_turns: Sequence[str]) -> DimensionScore:
    if not interviewer_turns:
        return DimensionScore("question_coverage", 0.0, "No interviewer turns recorded.")
    asked = len(interviewer_turns)
    answered = sum(1 for t in candidate_turns if len(t.strip()) > 5)
    coverage = answered / asked
    score = min(100.0, coverage * 100.0)
    return DimensionScore(
        "question_coverage",
        round(score, 1),
        f"answered {answered}/{asked} interviewer turns",
    )


# ---------------------------------------------------------------------------
# Top-level entry point
# ---------------------------------------------------------------------------


def compute_seven_dimensions(
    transcript: Sequence[Dict[str, Any]],
    interview_type: str = "technical",
) -> Dict[str, Any]:
    """Compute all 7 dimensions + an overall score 0-100."""
    cand = _candidate_turns(transcript)
    ints = _interviewer_turns(transcript)

    dims = [
        _score_technical_knowledge(cand, interview_type),
        _score_communication(cand),
        _score_confidence(cand),
        _score_relevance(cand, ints),
        _score_depth(cand),
        _score_star(cand, interview_type),
        _score_coverage(cand, ints),
    ]

    breakdown = {d.name: {"score": d.score, "notes": d.notes} for d in dims}
    overall = round(sum(d.score for d in dims) / len(dims), 1)

    # Model 12 — Anxiety Index: read from existing PrepAI session data.
    # For now we run the formula on whatever latency/filler/score signals
    # we can derive from the transcript; richer data comes from the DB
    # in interview_tasks.py post-processing.
    anxiety_payload: Optional[Dict[str, Any]] = None
    try:
        models = get_models()
        if models.anxiety_weights:
            latencies = [len(t) / 200.0 for t in cand]  # rough proxy
            scores_last = [overall] * max(1, len(cand))
            filler_counts = [
                int(sum(len(p.findall(t)) for p in FILLER_PATTERNS)) for t in cand
            ]
            anxiety_payload = models.compute_anxiety(
                {
                    "filler_counts_last_5_sessions": filler_counts,
                    "avg_latency_last_5_sessions": latencies,
                    "overall_scores_last_5_sessions": scores_last,
                    "sessions_this_week": len(cand),
                    "sessions_last_week": len(ints),
                    "abandoned_sessions_ratio": 0.0,
                }
            )
    except Exception as e:  # pragma: no cover
        logger.debug("Model 12 anxiety scoring skipped: %s", e)

    out: Dict[str, Any] = {
        "overall_score": overall,
        "dimensions": breakdown,
    }
    if anxiety_payload:
        out["anxiety"] = anxiety_payload
    return out


# ---------------------------------------------------------------------------
# Optional: Claude Sonnet 4.6 narrative feedback
# ---------------------------------------------------------------------------


def render_narrative_with_claude(
    scoring: Dict[str, Any],
    transcript: Sequence[Dict[str, Any]],
    job_role: str,
    interview_type: str,
    api_key: Optional[str],
) -> Optional[Dict[str, Any]]:
    """Call Claude to produce strengths / improvements / next_steps.  Returns
    None when the API key is missing (caller falls back to deterministic text).
    """
    if not api_key:
        return None
    try:
        import anthropic

        client = anthropic.Anthropic(api_key=api_key)
        compact_transcript = "\n".join(
            f"{t.get('speaker','?')}: {(t.get('text') or t.get('content') or '')[:300]}"
            for t in (transcript or [])[:20]
        )
        prompt = (
            f"You scored a {interview_type} interview for a {job_role} role.\n"
            f"Per-dimension scores (0-100):\n{scoring['dimensions']}\n"
            f"Overall: {scoring['overall_score']}\n\n"
            f"Transcript (truncated):\n{compact_transcript}\n\n"
            "Return JSON with keys: strengths (list of 2-3 short strings), "
            "improvements (list of 2-3 short strings), next_steps (list of 2-3 actionable items)."
        )
        msg = client.messages.create(
            model="claude-3-5-sonnet-latest",
            max_tokens=600,
            messages=[{"role": "user", "content": prompt}],
        )
        text = msg.content[0].text if msg.content else ""
        import json
        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1:
            return None
        return json.loads(text[start : end + 1])
    except Exception as e:  # pragma: no cover - provider path
        logger.warning("Claude narrative feedback failed: %s", e)
        return None


def fallback_narrative(scoring: Dict[str, Any]) -> Dict[str, Any]:
    """Deterministic strengths / improvements / next_steps from the
    per-dimension scores.  Used when Claude is unavailable.
    """
    dims = scoring["dimensions"]
    sorted_low = sorted(dims.items(), key=lambda kv: kv[1]["score"])[:2]
    sorted_high = sorted(dims.items(), key=lambda kv: -kv[1]["score"])[:2]

    return {
        "strengths": [
            f"Strong showing in {sorted_high[0][0]} ({sorted_high[0][1]['score']}).",
            f"Solid performance in {sorted_high[1][0]} ({sorted_high[1][1]['score']}).",
        ],
        "improvements": [
            f"Work on {sorted_low[0][0]} (currently {sorted_low[0][1]['score']}).",
            f"Sharpen {sorted_low[1][0]} (currently {sorted_low[1][1]['score']}).",
        ],
        "next_steps": [
            "Re-run the same interview type after targeted practice.",
            "Pick one weak dimension and drill it with 5 mock questions.",
            "Review the transcript and rewrite your weakest answer.",
        ],
    }
