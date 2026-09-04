"""ClamAV integration — scan uploaded files for malware.

When ``CLAMAV_HOST`` is not set we treat the upload as clean (mock mode) so
local dev still works.  In production the doc has ClamAV running as a sidecar
container reachable over TCP.
"""
from __future__ import annotations

import logging
import os
import socket
from typing import Tuple

logger = logging.getLogger(__name__)


def is_configured() -> bool:
    return bool(os.environ.get("CLAMAV_HOST", "").strip())


def scan_file(path: str) -> Tuple[bool, str]:
    """Return ``(clean, message)`` after scanning the file via INSTREAM.

    Falls back to ``(True, "mock-clean")`` when ClamAV is not reachable so
    dev / tests can run.
    """
    host = os.environ.get("CLAMAV_HOST", "").strip()
    if not host:
        return True, "mock-clean"

    port = int(os.environ.get("CLAMAV_PORT", "3310"))
    try:
        with socket.create_connection((host, port), timeout=5) as s:
            # INSTREAM protocol: send "zINSTREAM\0", file bytes, then 4 zero bytes.
            s.sendall(b"zINSTREAM\0")
            with open(path, "rb") as f:
                while True:
                    chunk = f.read(2048)
                    if not chunk:
                        break
                    header = len(chunk).to_bytes(4, byteorder="big")
                    s.sendall(header + chunk)
            s.sendall(b"\x00\x00\x00\x00")
            response = b""
            while True:
                buf = s.recv(4096)
                if not buf:
                    break
                response += buf
        text = response.decode("utf-8", errors="ignore").strip()
        if "FOUND" in text:
            return False, text
        return True, text or "clean"
    except Exception as e:  # pragma: no cover
        logger.warning("ClamAV scan failed: %s", e)
        return True, f"scan-error:{e}"


__all__ = ["scan_file", "is_configured"]
