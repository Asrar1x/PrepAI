"""Model 4 — Emotion & Stress Detection (ResNet-18 on FER2013).

Drives the live-interview ``/ws/emotion`` WebSocket.  Receives
base64-encoded JPEG frames from the frontend, decodes them, runs
``model_manager.classify_emotion``, and returns the 7-class softmax
plus a per-session stress score (rolling average of ``fear`` +
``angry`` + ``sad``).

Why a service wrapper, not a direct model call?
- Pre-process step (decode + BGR→RGB) lives here.
- Per-session aggregation (last 30 frames) is the only thing that
  matters for the dashboard; the model itself is stateless.
"""
from __future__ import annotations

import base64
import logging
from collections import deque
from io import BytesIO
from typing import Any, Deque, Dict, Optional

import numpy as np

from app.ai.custom_models.model_manager import get_models

logger = logging.getLogger(__name__)

STRESS_LABELS = {"fear", "angry", "sad", "disgust"}


class EmotionSessionBuffer:
    """Rolling buffer of the last N emotion predictions for one session."""

    def __init__(self, maxlen: int = 30) -> None:
        self._buf: Deque[Dict[str, Any]] = deque(maxlen=maxlen)

    def push(self, label: str, conf: float) -> None:
        self._buf.append({"label": label, "confidence": conf})

    @property
    def stress_score(self) -> float:
        """0.0 = calm, 1.0 = high stress.  Simple ratio of stress frames."""
        if not self._buf:
            return 0.0
        n = len(self._buf)
        stress = sum(1 for r in self._buf if r["label"] in STRESS_LABELS)
        avg_conf = sum(r["confidence"] for r in self._buf) / n
        return round(min(1.0, (stress / n) * (0.5 + 0.5 * avg_conf)), 3)

    def dominant(self) -> Optional[str]:
        if not self._buf:
            return None
        counts: Dict[str, int] = {}
        for r in self._buf:
            counts[r["label"]] = counts.get(r["label"], 0) + 1
        return max(counts, key=counts.get)


def _decode_b64_jpeg(b64: str) -> Optional[np.ndarray]:
    """Decode a base64 data-URL or raw base64 JPEG/PNG into a HxWx3 array."""
    try:
        if "," in b64:
            b64 = b64.split(",", 1)[1]
        raw = base64.b64decode(b64)
        from PIL import Image  # PIL is a torchvision peer dep
        img = Image.open(BytesIO(raw)).convert("RGB")
        return np.array(img)
    except Exception as e:  # pragma: no cover
        logger.debug("emotion decode failed: %s", e)
        return None


def classify_frame(frame_b64: str) -> Dict[str, Any]:
    """Single-shot emotion classification of a base64 frame."""
    arr = _decode_b64_jpeg(frame_b64)
    if arr is None:
        return {"label": "neutral", "confidence": 0.5, "source": "decode-fail"}
    return get_models().classify_emotion(arr)


def session_summary(buffer: EmotionSessionBuffer) -> Dict[str, Any]:
    return {
        "dominant_emotion": buffer.dominant(),
        "stress_score": buffer.stress_score,
        "frames_observed": len(buffer._buf),
    }


__all__ = [
    "EmotionSessionBuffer",
    "classify_frame",
    "session_summary",
    "STRESS_LABELS",
]
