from sqlalchemy import Column, String, Integer, DateTime, JSON, ForeignKey, Float
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime, timezone
from app.core.database import Base

class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    job_role = Column(String, nullable=False)
    company_target = Column(String, nullable=True)
    interview_type = Column(String, nullable=False)
    persona = Column(String, nullable=False)
    status = Column(String, default="in_progress", index=True)
    livekit_room_id = Column(String, nullable=True)
    started_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    ended_at = Column(DateTime(timezone=True), nullable=True)
    duration_seconds = Column(Integer, default=0)
    turn_count = Column(Integer, default=0)
    transcript = Column(JSON, default=[])
    audio_url = Column(String, nullable=True)
    overall_score = Column(Float, nullable=True)
    score_breakdown = Column(JSON, nullable=True)
    feedback_report = Column(JSON, nullable=True)
    report_url = Column(String, nullable=True)
    resume_id = Column(UUID(as_uuid=True), nullable=True)
