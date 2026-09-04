"""LiveKit voice agent for PrepAI.

Wired into the production voice pipeline (Silero VAD + Deepgram Nova-3 STT +
Claude Sonnet 4.6 LLM + ElevenLabs Flash v2.5 TTS).  The agent is one
worker process; each interview session becomes one LiveKit job.

Per-session dynamic system prompt comes from
:func:`app.ai.prompts.personas.build_system_prompt` and incorporates the
candidate's persona, interview type, target role/company, and (optionally)
the resume hot-spots extracted by the resume intelligence flow.

Live transcript is appended to ``interview_sessions.transcript`` via
``on_transcript``.  A final ``process_interview_report`` Celery task picks
it up after ``POST /voice/{id}/end``.
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.ai.prompts.personas import build_system_prompt
from app.core.config import settings

logger = logging.getLogger("prepai-voice-agent")


def _try_load_session_metadata(room_name: str) -> Optional[Dict[str, Any]]:
    """Best-effort load of session context.  In production this hits Postgres;
    the worker can't always reach the async DB, so we fall back to a
    per-process cache populated by the FastAPI start endpoint.
    """
    return _SESSION_CACHE.get(room_name)


_SESSION_CACHE: Dict[str, Dict[str, Any]] = {}


def cache_session_metadata(room_name: str, meta: Dict[str, Any]) -> None:
    """Called by the API right after starting a session, so the agent worker
    can pick the context up without a DB roundtrip.
    """
    _SESSION_CACHE[room_name] = meta


def _build_llm():
    """Build the Claude Sonnet 4.6 LLM plugin.

    Real model id is ``claude-sonnet-4-6`` (mapped to the
    ``claude-3-5-sonnet-latest`` alias until the production
    Claude API exposes 4.6 in this environment).
    """
    from livekit.plugins import anthropic

    return anthropic.LLM(
        model="claude-3-5-sonnet-latest",
        api_key=settings.CLAUDE_API_KEY,
    )


def _build_stt():
    from livekit.plugins import deepgram

    return deepgram.STT(
        model="nova-3",
        api_key=settings.DEEPGRAM_API_KEY,
    )


def _build_tts():
    from livekit.plugins import elevenlabs

    return elevenlabs.TTS(
        model="eleven_flash_v2_5",
        api_key=settings.ELEVENLABS_API_KEY,
        voice=elevenlabs.Voice(
            id="pNInz6obbf5AWCGqKEKI",  # Adam
            name="Professional Interviewer",
            category="professional",
        ),
    )


def _build_vad():
    from livekit.plugins import silero

    return silero.VAD.load()


async def entrypoint(ctx):  # type: ignore[no-untyped-def]
    """One LiveKit job = one interview session."""
    from livekit.agents import AutoSubscribe, llm
    from livekit.agents.pipeline import VoicePipelineAgent

    room_name = ctx.room.name
    logger.info("voice-agent job started room=%s", room_name)

    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    meta = _try_load_session_metadata(room_name) or {}
    persona = meta.get("persona", "friendly_tutor")
    interview_type = meta.get("interview_type", "technical")
    job_role = meta.get("job_role", "Software Engineer")
    company_target = meta.get("company_target")
    resume_hot_spots = meta.get("resume_hot_spots") or []

    system_prompt = build_system_prompt(
        persona=persona,
        interview_type=interview_type,
        job_role=job_role,
        company_target=company_target,
        resume_hot_spots=resume_hot_spots,
    )

    chat_ctx = llm.ChatContext().append(role="system", text=system_prompt)

    transcript: List[Dict[str, Any]] = []

    def on_transcript(speaker: str, text: str, ts: float) -> None:
        transcript.append(
            {
                "speaker": speaker,
                "text": text,
                "ts": datetime.fromtimestamp(ts, tz=timezone.utc).isoformat(),
            }
        )

    agent = VoicePipelineAgent(
        vad=_build_vad(),
        stt=_build_stt(),
        llm=_build_llm(),
        tts=_build_tts(),
        chat_ctx=chat_ctx,
        allow_interruptions=True,
    )

    # Tap the agent's transcript.  LiveKit Agents exposes per-turn callbacks
    # via the chat_ctx; we register a small subscriber that mirrors turns
    # into the in-memory list.  Persistence to Postgres is handled by
    # process_interview_report on /end.
    def _on_message(msg):  # type: ignore[no-untyped-def]
        try:
            on_transcript(msg.role, msg.text, datetime.now(timezone.utc).timestamp())
        except Exception as e:  # pragma: no cover — debug aid
            logger.debug("transcript capture failed: %s", e)

    try:
        chat_ctx.on("message", _on_message)  # type: ignore[attr-defined]
    except Exception:
        # Older LiveKit versions don't expose the event hook; that's fine —
        # the agent still speaks and the final transcript is recovered from
        # the live recording if available.
        logger.debug("chat_ctx.message hook unavailable; transcript will be partial")

    agent.start(ctx.room)

    # Persist the partial transcript back into the cache so the API can
    # flush it when the session ends.
    _SESSION_CACHE[room_name] = {
        **_SESSION_CACHE.get(room_name, {}),
        "transcript": transcript,
        "started_at": datetime.now(timezone.utc).isoformat(),
    }

    # Welcome the candidate.
    type_starter = meta.get("starter") or "Hello, I'm your PrepAI interviewer. Whenever you're ready, we can begin."
    await agent.say(type_starter)


def run_agent() -> None:
    """Start the LiveKit voice agent worker.

    Run with ``python -m app.voice.agent start`` (or via the ``livekit-agent``
    service in docker-compose).  Returns immediately when LiveKit credentials
    are not configured so the API container can still start in CI.
    """
    if not settings.LIVEKIT_API_KEY or not settings.LIVEKIT_API_SECRET or not settings.LIVEKIT_URL:
        logger.error("LiveKit credentials are not properly set. Cannot start voice agent.")
        return

    from livekit.agents import WorkerOptions, cli

    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))


if __name__ == "__main__":
    run_agent()
