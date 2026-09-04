"""Model 7 — Group Discussion Contribution Analyser (BERT 5-class).

Called by the ``/gd/{session_id}/score`` endpoint.  For every
student turn in the GD transcript, runs Model 7 to assign a role
label (initiator / facilitator / information_giver / opinion_seeker
/ silent_observer).  Then aggregates to a per-student scorecard.
"""
from __future__ import annotations

import logging
from collections import Counter
from typing import Any, Dict, List, Sequence

from app.ai.custom_models.model_manager import get_models

logger = logging.getLogger(__name__)


def classify_turn(turn_text: str) -> Dict[str, Any]:
    return get_models().classify_gd_turn(turn_text)


def score_gd(turns: Sequence[Dict[str, Any]]) -> Dict[str, Any]:
    """Score a full GD transcript.  Each turn is ``{"speaker": str, "text": str}``.
    Returns per-student and session-level aggregates.
    """
    if not turns:
        return {"students": [], "session": {"empty": True}}

    per_student: Dict[str, Counter] = {}
    per_student_turns: Dict[str, int] = {}
    for t in turns:
        speaker = t.get("speaker") or t.get("user_id") or "unknown"
        text = (t.get("text") or t.get("content") or "").strip()
        if not text:
            continue
        per_student.setdefault(speaker, Counter())
        per_student_turns[speaker] = per_student_turns.get(speaker, 0) + 1
        label = classify_turn(text).get("label", "information_giver")
        per_student[speaker][label] += 1

    students = []
    for speaker, counter in per_student.items():
        n = sum(counter.values()) or 1
        # Contribution score: weighted mix of turn count and role mix.
        role_weights = {
            "initiator": 1.0,
            "facilitator": 0.9,
            "information_giver": 0.7,
            "opinion_seeker": 0.6,
            "silent_observer": 0.1,
        }
        score = sum(counter[r] * role_weights.get(r, 0.5) for r in counter)
        score = round(100.0 * min(1.0, score / (n * 1.0)), 1)
        students.append({
            "speaker": speaker,
            "turns": per_student_turns[speaker],
            "role_mix": dict(counter),
            "contribution_score": score,
        })

    students.sort(key=lambda s: -s["contribution_score"])
    return {
        "students": students,
        "session": {
            "total_turns": len(turns),
            "participants": len(per_student),
        },
    }


__all__ = ["classify_turn", "score_gd"]
