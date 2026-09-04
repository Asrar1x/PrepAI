from sqlalchemy import Column, String, Integer, DateTime, JSON, Boolean
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime, timezone
from app.core.database import Base


class Role(Base):
    __tablename__ = "roles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug = Column(String, unique=True, nullable=False, index=True)
    title = Column(String, nullable=False)
    category = Column(String, nullable=False, index=True)
    summary = Column(String, nullable=True)
    salary_range = Column(String, nullable=True)
    difficulty = Column(String, nullable=True)
    skills = Column(JSON, default=list)
    interview_rounds = Column(Integer, default=3)
    is_active = Column(Boolean, default=True)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class CompanyPattern(Base):
    __tablename__ = "company_patterns"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    industry = Column(String, nullable=True)
    hiring_signal = Column(String, default="active")
    salary_range = Column(String, nullable=True)
    assessment_summary = Column(String, nullable=True)
    sections = Column(JSON, default=list)
    timings = Column(JSON, default=dict)
    distribution = Column(JSON, default=dict)
    negative_marking = Column(JSON, default=dict)
    is_active = Column(Boolean, default=True)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
