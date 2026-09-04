import redis.asyncio as redis
from app.core.config import settings

class RedisClient:
    def __init__(self):
        self.redis = None

    async def connect(self):
        self.redis = redis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True
        )

    async def disconnect(self):
        if self.redis:
            await self.redis.close()

    async def get(self, key: str):
        if not self.redis:
            return None
        return await self.redis.get(key)

    async def set(self, key: str, value, ex: int | None = None):
        if not self.redis:
            return None
        return await self.redis.set(key, value, ex=ex)

    async def delete(self, *keys: str):
        if not self.redis:
            return 0
        return await self.redis.delete(*keys)

redis_client = RedisClient()
