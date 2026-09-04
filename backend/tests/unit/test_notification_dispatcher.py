"""Unit tests for the notification dispatcher templates + sync fan-out."""
import asyncio

from app.services import notification_dispatcher


def test_subject_for_trigger_each_kind():
    cases = {
        "daily_practice": {"company": "TCS"},
        "streak_at_risk": {"streak": 5},
        "weak_topic_alert": {"topic": "Probability"},
        "interview_ready": {"report_url": "/r/x"},
        "company_drive_activated": {"company": "Infosys"},
        "weekly_digest": {"summary": "x"},
        "admin_broadcast": {"title": "Heads up"},
    }
    for trigger, payload in cases.items():
        subject = notification_dispatcher._subject_for_trigger(trigger, payload)
        assert subject and isinstance(subject, str)


def test_dispatch_sync_mocks_when_no_keys(monkeypatch):
    """When RESEND_API_KEY and WHATSAPP_TOKEN are unset, the mock path
    returns True and the dict is well-formed.
    """
    class FakeUser:
        full_name = "Test"
        email = "t@example.com"
        phone_e164 = "+911234567890"

    monkeypatch.delenv("RESEND_API_KEY", raising=False)
    monkeypatch.delenv("WHATSAPP_TOKEN", raising=False)
    sent = notification_dispatcher.dispatch_sync(
        FakeUser(), trigger="interview_ready", payload={"report_url": "/r/x"}
    )
    assert sent["email"] is True
    assert sent["whatsapp"] is True


def test_render_email_for_each_trigger_contains_user_name():
    class FakeUser:
        full_name = "Mohan"
        email = "m@example.com"

    for trigger, payload in [
        ("daily_practice", {"company": "TCS"}),
        ("streak_at_risk", {"streak": 3}),
        ("weak_topic_alert", {"topic": "SQL"}),
        ("interview_ready", {"report_url": "/r/x"}),
        ("company_drive_activated", {"company": "TCS"}),
        ("weekly_digest", {"summary": "5 sessions"}),
    ]:
        subject, html = notification_dispatcher._render_email(trigger, FakeUser(), payload)
        assert "Mohan" in html
        assert subject
