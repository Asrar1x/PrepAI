"""
Laya Decision Engine - Health and Diagnostics
Provides operational status, telemetry, and readiness checks.
"""

import time
import os
import psutil
from fastapi import APIRouter
from model import get_model_status, is_ready

router = APIRouter(tags=["Health"])

_start_time = time.time()


@router.get("/health")
def health_check():
    """Health check endpoint for Node.js backend probe and Kubernetes/Docker readiness."""
    process = psutil.Process(os.getpid()) if hasattr(psutil, 'Process') else None
    mem_info = process.memory_info() if process else None

    status = get_model_status()

    return {
        "status": "healthy" if is_ready() else ("error" if status.get("status") == "error" else "loading"),
        "service": "laya-engine",
        "model_ready": is_ready(),
        "model_metadata": status,
        "uptime_seconds": round(time.time() - _start_time, 2),
        "memory_mb": round(mem_info.rss / (1024 * 1024), 2) if mem_info else None
    }
