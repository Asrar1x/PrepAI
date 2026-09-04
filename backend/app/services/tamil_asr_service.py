"""Model 8 — Tamil Speech Recognition (Wav2Vec2 XLSR-53).

Wraps ``model_manager.transcribe_tamil`` with input validation
(16 kHz mono PCM, ≤ 30 s) and adds a Whisper-small fallback for
Tamil when Model 8 is not yet downloaded.  The Whisper fallback is
``vasista22/whisper-tamil-small`` from HuggingFace, used inline so
the same call-site works on day one of MVP.
"""
from __future__ import annotations

import logging
import os
import tempfile
from typing import Any, Optional

import numpy as np

from app.ai.custom_models.model_manager import get_models

logger = logging.getLogger(__name__)

WHISPER_TAMIL_MODEL = "vasista22/whisper-tamil-small"
_SR = 16_000
_MAX_SECONDS = 30


def _validate_audio(audio_array: np.ndarray, sampling_rate: int) -> np.ndarray:
    if audio_array is None or len(audio_array) == 0:
        raise ValueError("empty audio")
    if sampling_rate != _SR:
        # Cheap linear resample; not studio-quality but OK for an MVP.
        new_len = int(len(audio_array) * _SR / sampling_rate)
        audio_array = np.interp(
            np.linspace(0, len(audio_array), new_len, endpoint=False),
            np.arange(len(audio_array)),
            audio_array,
        ).astype(np.float32)
    if len(audio_array) > _SR * _MAX_SECONDS:
        audio_array = audio_array[: _SR * _MAX_SECONDS]
    return audio_array.astype(np.float32)


def transcribe(audio_array: np.ndarray, sampling_rate: int = _SR) -> Dict[str, Any]:
    """Transcribe a Tamil audio clip.  Tries Model 8 first; on miss
    falls back to the open Whisper-Tamil model.
    """
    audio = _validate_audio(audio_array, sampling_rate)
    models = get_models()
    if models.tamil_model is not None:
        try:
            text = models.transcribe_tamil(audio, sampling_rate=_SR)
            return {"text": text, "source": "model8_wav2vec2"}
        except Exception as e:  # pragma: no cover
            logger.warning("Model 8 Tamil STT failed, trying whisper: %s", e)

    # Whisper fallback
    try:
        from transformers import pipeline
        if not hasattr(transcribe, "_pipe"):
            transcribe._pipe = pipeline(
                "automatic-speech-recognition",
                model=WHISPER_TAMIL_MODEL,
                chunk_length_s=20,
            )
        # write to a tmp wav because the pipeline expects a file path
        import soundfile as sf
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            sf.write(f.name, audio, _SR)
            tmp = f.name
        try:
            out = transcribe._pipe(tmp)
            return {"text": out.get("text", ""), "source": "whisper-fallback"}
        finally:
            try:
                os.unlink(tmp)
            except OSError:
                pass
    except Exception as e:  # pragma: no cover
        logger.warning("Whisper Tamil fallback failed: %s", e)
        return {"text": "", "source": "no-asr-available"}


__all__ = ["transcribe"]
