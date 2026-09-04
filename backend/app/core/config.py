import os
from typing import List
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")

    # Environment
    ENV: str = Field(default="development")
    DEBUG: bool = Field(default=False)

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/prepai"
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20

    # Redis
    REDIS_URL: str = "redis://localhost:6379/1"
    REDIS_BROKER_URL: str = "redis://localhost:6379/0"

    # Auth
    JWT_SECRET_KEY: str = "supersecret"
    JWT_REFRESH_SECRET_KEY: str = "superrefresh"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_EXPIRE_DAYS: int = 7

    # Frontend
    FRONTEND_URL: str = "http://localhost:3000"
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    # AI providers — external
    CLAUDE_API_KEY: str = ""
    CLAUDE_MODEL_INTERVIEW: str = "claude-3-5-sonnet-20241022"
    CLAUDE_MODEL_FAST: str = "claude-3-5-haiku-20241022"
    DEEPGRAM_API_KEY: str = ""
    ELEVENLABS_API_KEY: str = ""
    LIVEKIT_API_KEY: str = ""
    LIVEKIT_API_SECRET: str = ""
    LIVEKIT_URL: str = ""
    VOYAGE_API_KEY: str = ""
    RESEND_API_KEY: str = ""
    RESEND_FROM: str = "PrepAI <onboarding@resend.dev>"

    # WhatsApp Business API
    WHATSAPP_PHONE_ID: str = ""
    WHATSAPP_TOKEN: str = ""

    # R2 / S3
    R2_ENDPOINT_URL: str = ""
    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_BUCKET_RESUMES: str = "resumes"
    R2_BUCKET_AUDIO: str = "audio"
    R2_BUCKET_REPORTS: str = "reports"

    # Local ML
    CLAMAV_HOST: str = "localhost"
    CLAMAV_PORT: int = 3310
    SENTRY_DSN: str = ""
    AI_PROVIDER: str = "external"  # "external" or "local"
    CUSTOM_MODEL_PATH: str = "./models"
    LOG_LEVEL: str = "INFO"

    # Caching
    SOLUTION_CACHE_TTL: int = 7 * 24 * 60 * 60  # 7 days
    QUESTION_CACHE_TTL: int = 24 * 60 * 60  # 24h

    # Daily practice
    DAILY_PRACTICE_HOUR_IST: int = 8
    DAILY_PRACTICE_QUESTIONS: int = 20


settings = Settings()
