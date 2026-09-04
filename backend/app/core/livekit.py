import logging
from typing import Optional
from livekit import api
from app.core.config import settings

logger = logging.getLogger(__name__)

async def create_livekit_token(
    room_name: str,
    participant_name: str,
    participant_identity: str,
    is_admin: bool = False
) -> str:
    """
    Generate a LiveKit token for a participant to join a room.
    """
    if not settings.LIVEKIT_API_KEY or not settings.LIVEKIT_API_SECRET:
        logger.warning("LiveKit API Key or Secret is missing. Returning dummy token.")
        return "dummy_token"

    token = api.AccessToken(
        settings.LIVEKIT_API_KEY,
        settings.LIVEKIT_API_SECRET
    )
    
    grant = api.VideoGrant(
        room_join=True,
        room=room_name,
        can_publish=True,
        can_publish_data=True,
        can_subscribe=True,
        room_admin=is_admin
    )
    
    token.with_identity(participant_identity)
    token.with_name(participant_name)
    token.with_grants(grant)

    return token.to_jwt()
