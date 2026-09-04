from sqlalchemy import Column, String, Integer, DateTime, JSON, Boolean, Float
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime, timezone
from app.core.database import Base


class QuestionBank(Base):
    __tablename__ = "question_bank"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    category = Column(String, index=True, nullable=False)
    sub_category = Column(String, nullable=True)
    job_role = Column(String, index=True, nullable=True)
    company_tags = Column(JSON, default=list)
    difficulty = Column(String, index=True, nullable=False)
    question_text = Column(String, nullable=False)
    options = Column(JSON, nullable=True)
    correct_answer = Column(String, nullable=False)
    expected_key_points = Column(JSON, nullable=True)
    explanation = Column(String, nullable=True)
    embedding = Column(JSON, nullable=True)
    source = Column(String, nullable=True)
    quality_score = Column(Float, default=0.0)
    times_used = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
