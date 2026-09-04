from sqlalchemy import Column, String, Integer, DateTime, JSON, ForeignKey, Float
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime, timezone
from app.core.database import Base

class AptitudeSession(Base):
    __tablename__ = "aptitude_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    job_role = Column(String, nullable=False)
    company_pattern = Column(String, nullable=True)
    mode = Column(String, nullable=False)
    duration_minutes = Column(Integer, default=0)
    total_questions = Column(Integer, default=0)
    correct_count = Column(Integer, default=0)
    wrong_count = Column(Integer, default=0)
    skipped_count = Column(Integer, default=0)
    score = Column(Float, default=0.0)
    max_difficulty_reached = Column(String, nullable=True)
    category_scores = Column(JSON, default={})
    weak_topics = Column(JSON, default=[])
    questions_data = Column(JSON, default=[])
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
