from sqlalchemy import Column, String, Integer, Boolean, Float, Text, JSON, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid
from backend.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    college_name = Column(String)
    branch = Column(String)
    graduation_year = Column(Integer)
    target_roles = Column(JSON) # Storing array as JSON for SQLite compatibility
    role = Column(String, default='student')
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login = Column(DateTime(timezone=True))

class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    job_role = Column(String, nullable=False)
    company_target = Column(String)
    interview_type = Column(String, nullable=False)
    status = Column(String, default="in_progress")
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    ended_at = Column(DateTime(timezone=True))
    duration_seconds = Column(Integer)
    transcript = Column(JSON) # Captures full conversation 
    overall_score = Column(Float)
    score_breakdown = Column(JSON)
    feedback_report = Column(JSON)
    report_url = Column(String)

class AptitudeSession(Base):
    __tablename__ = "aptitude_sessions"

    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    job_role = Column(String)
    company_pattern = Column(String)
    duration_minutes = Column(Integer, nullable=False)
    total_questions = Column(Integer, nullable=False)
    correct_count = Column(Integer, default=0)
    wrong_count = Column(Integer, default=0)
    skipped_count = Column(Integer, default=0)
    score = Column(Float)
    category_scores = Column(JSON)
    weak_topics = Column(JSON)
    questions_data = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class QuestionBank(Base):
    __tablename__ = "question_bank"

    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    category = Column(String)
    sub_category = Column(String)
    job_role = Column(String)
    company_tags = Column(JSON)
    difficulty = Column(String)
    question_text = Column(Text)
    options = Column(JSON)
    correct_answer = Column(Text)
    explanation = Column(Text)
    source = Column(String)
    quality_score = Column(Integer)
