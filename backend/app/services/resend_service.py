"""Resend transactional email integration.

Uses the `resend` package.  Falls back to a logged-mock when the API key is
absent so local dev still works end-to-end.
"""
from __future__ import annotations

import logging
import os
from typing import Iterable, Optional

logger = logging.getLogger(__name__)


def send_email(
    to: str | Iterable[str],
    subject: str,
    html: str,
    from_addr: Optional[str] = None,
) -> bool:
    api_key = os.environ.get("RESEND_API_KEY") or ""
    if not api_key:
        logger.info("[resend-mock] to=%s subject=%s body_len=%d", to, subject, len(html))
        return True
    try:
        import resend

        resend.api_key = api_key
        resend.Emails.send(
            {
                "from": from_addr or os.environ.get("RESEND_FROM", "PrepAI <noreply@prepai.dev>"),
                "to": list(to) if not isinstance(to, str) else [to],
                "subject": subject,
                "html": html,
            }
        )
        return True
    except Exception as e:
        logger.warning("Resend send failed: %s", e)
        return False
