from celery import Celery
from celery.schedules import crontab

from app.core.config import settings

celery_app = Celery(
    "worker",
    broker=settings.REDIS_BROKER_URL,
    backend=settings.REDIS_URL,
)

celery_app.conf.task_routes = {
    "app.tasks.ai.*": "ai-queue",
    "app.tasks.audio.*": "audio-queue",
}

# Daily beat schedule — see backend/app/tasks/daily_tasks.py.
# All times are UTC; convert in the task body if you want IST.
celery_app.conf.beat_schedule = {
    "daily-practice-scheduler": {
        "task": "app.tasks.daily_tasks.daily_practice_scheduler",
        # 02:30 UTC ≈ 08:00 IST
        "schedule": crontab(hour=2, minute=30),
    },
    "streak-at-risk-check": {
        "task": "app.tasks.daily_tasks.streak_at_risk_check",
        # 20:00 UTC ≈ 01:30 IST next day; nudge late-nighters
        "schedule": crontab(hour=20, minute=0),
    },
    "weekly-digest": {
        "task": "app.tasks.daily_tasks.weekly_digest",
        # Sundays 09:00 UTC
        "schedule": crontab(hour=9, minute=0, day_of_week=0),
    },
}

celery_app.conf.timezone = "UTC"
