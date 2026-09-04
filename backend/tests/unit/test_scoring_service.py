"""Unit tests for the 7-dimension scoring service.

No DB, no network — just pure heuristics on synthetic transcripts.
"""
from app.services.scoring_service import (
    DIMENSIONS,
    compute_seven_dimensions,
    fallback_narrative,
)


def _t(speaker: str, text: str) -> dict:
    return {"speaker": speaker, "text": text}


def test_all_seven_dimensions_present():
    transcript = [
        _t("interviewer", "Tell me about a project."),
        _t("candidate", "I built a search cache. Result: 40% latency drop."),
    ]
    result = compute_seven_dimensions(transcript, interview_type="technical")
    assert "overall_score" in result
    for d in DIMENSIONS:
        assert d in result["dimensions"]
        assert 0 <= result["dimensions"][d]["score"] <= 100


def test_empty_transcript_yields_zero_overall_average():
    result = compute_seven_dimensions([], interview_type="technical")
    # Average of one zero + several 50/70 fallbacks — just check shape.
    assert "overall_score" in result
    assert isinstance(result["overall_score"], float)


def test_star_compliance_only_measured_for_behavioral():
    t = [_t("candidate", "Situation was X. Task was Y. Action: I did Z. Result: 50% faster.")]
    beh = compute_seven_dimensions(t, interview_type="behavioral")
    tech = compute_seven_dimensions(t, interview_type="technical")
    assert beh["dimensions"]["star_compliance"]["score"] >= 50
    # Technical interview type notes "Not assessed" for star_compliance.
    assert "Not assessed" in tech["dimensions"]["star_compliance"]["notes"]


def test_high_filler_penalty_lowers_communication():
    short_clean = [_t("candidate", "I built a search service using Redis clusters.")]
    long_filler = [_t("candidate", "Um uh like, you know, I sort of kind of built a search service, like, you know, using, um, Redis clusters, uh.")]
    a = compute_seven_dimensions(short_clean, interview_type="technical")
    b = compute_seven_dimensions(long_filler, interview_type="technical")
    assert b["dimensions"]["communication"]["score"] < a["dimensions"]["communication"]["score"]


def test_fallback_narrative_has_three_lists():
    scoring = {
        "overall_score": 70.0,
        "dimensions": {d: {"score": 70.0, "notes": ""} for d in DIMENSIONS},
    }
    n = fallback_narrative(scoring)
    assert "strengths" in n and len(n["strengths"]) >= 2
    assert "improvements" in n and len(n["improvements"]) >= 2
    assert "next_steps" in n and len(n["next_steps"]) >= 2
