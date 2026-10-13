"""
Laya Model Manager - Singleton Loader
Guarantees the Laya non-autoregressive decision model is loaded once at startup and reused.
Never reloads the model per request.
"""

import os
import time
import logging
import torch

logger = logging.getLogger("laya-engine.model")
logger.setLevel(logging.INFO)

_agent = None
_load_error = None
_model_metadata = {
    "model_name": os.getenv("LAYA_MODEL", "convaiinnovations/laya"),
    "status": "uninitialized",
    "device": "cpu",
    "load_time_seconds": 0.0,
    "last_loaded": None
}


def load_laya_agent():
    global _agent, _load_error
    model_name = os.getenv("LAYA_MODEL", "convaiinnovations/laya")
    device = "cuda" if torch.cuda.is_available() else "cpu"

    start_time = time.time()
    logger.info(f"Initializing Laya Decision Agent with model '{model_name}' on {device}...")

    try:
        import laya
        # Load agent once; laya.load inspects local cache or downloads model checkpoint
        _agent = laya.load(model_name)
        elapsed = time.time() - start_time
        _model_metadata.update({
            "model_name": model_name,
            "status": "ready",
            "device": device,
            "load_time_seconds": round(elapsed, 2),
            "last_loaded": time.strftime("%Y-%m-%dT%H:%M:%SZ")
        })
        logger.info(f"Laya Agent successfully loaded in {elapsed:.2f}s")
        return _agent
    except Exception as e:
        _load_error = str(e)
        _model_metadata["status"] = "error"
        _model_metadata["error"] = _load_error
        logger.error(f"Failed to load Laya Agent: {e}")
        return None


def get_laya_agent():
    if _agent is None:
        return load_laya_agent()
    return _agent


def get_model_status():
    return _model_metadata


def is_ready():
    return _agent is not None
