"""Unit test for the PDF service — render a real report and confirm the file
exists and is non-trivial.
"""
import os

from app.services import pdf_service


def test_render_interview_pdf_creates_file():
    pdf_path = pdf_service.render_interview_pdf(
        session_id="unit-test-session-001",
        interview_meta={
            "job_role": "Backend Engineer",
            "company_target": "TCS",
            "interview_type": "technical",
            "persona": "bar_raiser",
        },
        scoring={
            "overall_score": 78.5,
            "dimensions": {
                "technical_knowledge": {"score": 80.0, "notes": "good"},
                "communication": {"score": 70.0, "notes": "ok"},
                "confidence": {"score": 75.0, "notes": "ok"},
                "relevance": {"score": 90.0, "notes": "great"},
                "depth": {"score": 60.0, "notes": "shallow"},
                "star_compliance": {"score": 70.0, "notes": "n/a"},
                "question_coverage": {"score": 95.0, "notes": "high"},
            },
        },
        narrative={
            "strengths": ["Relevance", "Coverage"],
            "improvements": ["Depth", "STAR compliance"],
            "next_steps": ["Practice 5 more depth questions."],
        },
        transcript=[
            {"speaker": "interviewer", "text": "Walk me through a system design."},
            {"speaker": "candidate", "text": "Sure. I would start with the requirements…"},
        ],
    )
    assert os.path.isfile(pdf_path)
    assert os.path.getsize(pdf_path) > 1000
    # First bytes are the PDF magic
    with open(pdf_path, "rb") as f:
        assert f.read(4) == b"%PDF"
