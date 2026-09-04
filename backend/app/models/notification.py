from sqlalchemy import Column, String, DateTime, Date, JSON, ForeignKey, Boolean, Integer
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime, timezone
from app.core.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    type = Column(String, nullable=False, index=True)
    category = Column(String, nullable=False, default="system")
    title = Column(String, nullable=False)
    body = Column(String, nullable=True)
    payload = Column(JSON, default=dict)
    href = Column(String, nullable=True)
    read_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)


class UserNotificationPref(Base):
    __tablename__ = "user_notification_prefs"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    prefs = Column(JSON, default=dict)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class DailyQuest(Base):
    __tablename__ = "daily_quests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    date = Column(Date, nullable=False, index=True)
    kind = Column(String, nullable=False, default="aptitude")
    target = Column(Integer, nullable=False, default=20)
    completed = Column(Boolean, default=False)
    metadata_json = Column("metadata_json", JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
