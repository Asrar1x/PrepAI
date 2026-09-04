"""WhatsApp Business Cloud API integration.

Sends templated messages via the Meta Cloud API.  Falls back to a logged
mock when credentials are absent so local dev still works.
"""
from __future__ import annotations

import json
import logging
import os
from typing import Optional
from urllib import request as urlrequest

logger = logging.getLogger(__name__)


def send_text(to_phone_e164: str, message: str) -> bool:
    """Send a plain-text message to a WhatsApp user.

    `to_phone_e164` must include the + and country code (e.g. +919999000111).
    """
    token = os.environ.get("WHATSAPP_TOKEN") or ""
    phone_id = os.environ.get("WHATSAPP_PHONE_ID") or ""
    if not token or not phone_id:
        logger.info("[whatsapp-mock] to=%s msg=%s", to_phone_e164, message[:120])
        return True
    try:
        url = f"https://graph.facebook.com/v20.0/{phone_id}/messages"
        payload = {
            "messaging_product": "whatsapp",
            "to": to_phone_e164.lstrip("+"),
            "type": "text",
            "text": {"body": message},
        }
        req = urlrequest.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        with urlrequest.urlopen(req, timeout=10) as resp:
            return resp.status in (200, 201)
    except Exception as e:
        logger.warning("WhatsApp send failed: %s", e)
        return False
