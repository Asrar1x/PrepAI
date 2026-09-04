from sqlalchemy import Column, String, DateTime, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime, timezone
from app.core.database import Base


class Resume(Base):
    __tablename__ = "resumes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    filename = Column(String, nullable=False)
    file_url = Column(String, nullable=False)
    storage_backend = Column(String, default="local")
    parse_status = Column(String, default="pending")
    parsed_data = Column(JSON, nullable=True)
    feedback_report = Column(JSON, nullable=True)
    ats_score = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
