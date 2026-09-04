"""Unit tests for gamification XP rules + badge grants."""
import pytest

from app.services import gamification_service


def test_xp_rules_table_is_complete():
    required = {
        "aptitude_complete", "aptitude_perfect", "interview_complete",
        "interview_strong", "daily_quest_complete", "resume_upload",
    }
    assert required.issubset(gamification_service.XP_RULES.keys())
    for v in gamification_service.XP_RULES.values():
        assert v > 0


def test_badge_rules_table_is_complete():
    for slug, (title, desc) in gamification_service.BADGE_RULES.items():
        assert title and desc
        assert isinstance(slug, str)
