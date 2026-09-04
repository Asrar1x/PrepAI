"""Unit test for the local-fallback resume parser."""
from app.ai.prompts.resume import local_fallback_parse


def test_fallback_parser_handles_synthetic_resume():
    text = (
        "John Doe\njohndoe@example.com\n\n"
        "EXPERIENCE\nBuilt a Python service using FastAPI and Postgres. "
        "Deployed on AWS. Improved query latency by 40 percent. Led the team of 3.\n\n"
        "PROJECTS\nDesigned a React dashboard. Created a Kubernetes cluster.\n\n"
        "SKILLS\nPython, JavaScript, React, Docker, AWS, Kubernetes\n"
        "EDUCATION\nB.S. Computer Science, 2024\n"
    )
    parsed = local_fallback_parse(text)
    assert "Python" in parsed["skills"]
    assert "React" in parsed["skills"]
    assert "Aws" in parsed["skills"] or "AWS" in parsed["skills"]
    assert 5 <= len(parsed["interview_hot_spots"]) <= 8
    six = parsed["six_dimension_scores"]
    for dim in (
        "keyword_relevance", "section_completeness", "quantified_achievements",
        "action_verb_quality", "machine_readability", "length_density",
    ):
        assert dim in six
        assert 0 <= six[dim] <= 100
    assert len(parsed["improvement_tips"]) >= 3
