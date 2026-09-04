"""Cloudflare R2 (S3-compatible) storage wrapper.

Falls back to the local filesystem when the R2 credentials are absent so
local development still works end-to-end.
"""
from __future__ import annotations

import logging
import os
import shutil
from typing import Optional

logger = logging.getLogger(__name__)


LOCAL_FALLBACK_ROOT = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "uploads")
)


def _env(name: str) -> str:
    return os.environ.get(name, "").strip()


def is_configured() -> bool:
    return all(
        _env(k)
        for k in ("R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET", "R2_ENDPOINT")
    )


def put_object(local_path: str, key: str) -> str:
    """Upload a local file to R2 and return its public URL.

    When R2 is not configured we copy the file to ``uploads/`` and return a
    ``file://`` URL — the API serves it back via ``/uploads/<key>``.
    """
    if not is_configured():
        os.makedirs(LOCAL_FALLBACK_ROOT, exist_ok=True)
        dest = os.path.join(LOCAL_FALLBACK_ROOT, key)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        shutil.copy2(local_path, dest)
        return f"/uploads/{key}"

    try:
        import boto3

        client = boto3.client(
            "s3",
            endpoint_url=_env("R2_ENDPOINT"),
            aws_access_key_id=_env("R2_ACCESS_KEY_ID"),
            aws_secret_access_key=_env("R2_SECRET_ACCESS_KEY"),
            region_name="auto",
        )
        client.upload_file(local_path, _env("R2_BUCKET"), key)
        public_base = _env("R2_PUBLIC_BASE") or f"{_env('R2_ENDPOINT').rstrip('/')}/{_env('R2_BUCKET')}"
        return f"{public_base.rstrip('/')}/{key}"
    except Exception as e:  # pragma: no cover
        logger.warning("R2 upload failed, falling back to local FS: %s", e)
        os.makedirs(LOCAL_FALLBACK_ROOT, exist_ok=True)
        dest = os.path.join(LOCAL_FALLBACK_ROOT, key)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        shutil.copy2(local_path, dest)
        return f"/uploads/{key}"


def get_object(key: str) -> Optional[bytes]:
    """Fetch an object's bytes (used by the dev-mode /uploads/ proxy)."""
    if not is_configured():
        path = os.path.join(LOCAL_FALLBACK_ROOT, key)
        if os.path.isfile(path):
            with open(path, "rb") as f:
                return f.read()
        return None
    try:
        import boto3

        client = boto3.client(
            "s3",
            endpoint_url=_env("R2_ENDPOINT"),
            aws_access_key_id=_env("R2_ACCESS_KEY_ID"),
            aws_secret_access_key=_env("R2_SECRET_ACCESS_KEY"),
            region_name="auto",
        )
        obj = client.get_object(Bucket=_env("R2_BUCKET"), Key=key)
        return obj["Body"].read()
    except Exception as e:  # pragma: no cover
        logger.warning("R2 download failed: %s", e)
        return None
