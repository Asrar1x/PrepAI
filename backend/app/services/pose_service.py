"""Model 5 — Body Language Classification (MediaPipe + 3-layer MLP).

The frontend streams 33-pose keypoints from MediaPipe Pose.  We turn
each frame into the 103-D feature vector the model expects (raw
``(x, y, z)`` flatten + shoulder symmetry + nose-to-shoulder
distance), then call ``model_manager.classify_posture``.

A per-session buffer returns a posture quality score and a fidget
rate for the dashboard.
"""
from __future__ import annotations

import logging
import math
from collections import deque
from typing import Any, Deque, Dict, List, Optional

import numpy as np

from app.ai.custom_models.model_manager import get_models

logger = logging.getLogger(__name__)

# Mirrors collect_pose.py — keep these in sync if you change either.
FEATURE_DIM = 103
GOOD = "good_posture"


def geometric_features(keypoints: List[List[float]]) -> np.ndarray:
    """keypoints: 33 [x, y, z] in normalised MediaPipe coords.  Returns 103-D."""
    kp = np.asarray(keypoints, dtype=np.float32)
    if kp.shape != (33, 3):
        return np.zeros(FEATURE_DIM, dtype=np.float32)
    feats = kp.flatten().tolist()
    sym = abs(float(kp[11, 1] - kp[12, 1]))
    nose = kp[0]
    shoulder_mid = (kp[11] + kp[12]) / 2
    dist = float(np.linalg.norm(nose - shoulder_mid))
    feats.append(sym)
    feats.append(dist)
    out = np.array(feats, dtype=np.float32)
    return out[:FEATURE_DIM] if out.size >= FEATURE_DIM else np.pad(out, (0, FEATURE_DIM - out.size))


class PostureBuffer:
    def __init__(self, maxlen: int = 60) -> None:
        self._buf: Deque[str] = deque(maxlen=maxlen)

    def push(self, label: str) -> None:
        self._buf.append(label)

    @property
    def posture_quality(self) -> float:
        if not self._buf:
            return 0.5
        good = sum(1 for l in self._buf if l == GOOD)
        return round(good / len(self._buf), 3)

    @property
    def fidget_rate(self) -> float:
        if len(self._buf) < 2:
            return 0.0
        changes = sum(1 for a, b in zip(list(self._buf), list(self._buf)[1:]) if a != b)
        return round(changes / (len(self._buf) - 1), 3)


def classify_keypoints(keypoints: List[List[float]]) -> Dict[str, Any]:
    feats = geometric_features(keypoints).tolist()
    return get_models().classify_posture(feats)


def session_summary(buffer: PostureBuffer) -> Dict[str, Any]:
    return {
        "posture_quality": buffer.posture_quality,
        "fidget_rate": buffer.fidget_rate,
        "frames_observed": len(buffer._buf),
    }


__all__ = [
    "FEATURE_DIM",
    "PostureBuffer",
    "classify_keypoints",
    "session_summary",
]
