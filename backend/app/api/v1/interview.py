import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from datetime import datetime, timezone

from app.api.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.interview import InterviewSession
from app.ai.custom_models.model_manager import ml_models

router = APIRouter()

class InterviewStartRequest(BaseModel):
    job_role: str
    company_target: Optional[str] = None
    interview_type: str = "technical"
    resume_id: Optional[str] = None

class InterviewMessage(BaseModel):
    role: str
    content: str

class InterviewChatRequest(BaseModel):
    session_id: str
    message: str
    history: List[InterviewMessage] = []

class InterviewChatResponse(BaseModel):
    reply: str
    quality_score: Optional[float] = None
    relevance_score: Optional[float] = None

@router.post("/start")
async def start_interview(
    request: InterviewStartRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    session_id = uuid.uuid4()
    
    interview = InterviewSession(
        id=session_id,
        user_id=current_user.id,
        job_role=request.job_role,
        company_target=request.company_target,
        interview_type=request.interview_type,
        status="in_progress"
    )
    
    db.add(interview)
    
    # Check for resume injection
    greeting = f"Hello {current_user.full_name}. I will be interviewing you for the {request.job_role} role today."
    if request.resume_id:
        from sqlalchemy.future import select
        from app.models.resume import Resume
        res = await db.execute(select(Resume).where(Resume.id == uuid.UUID(request.resume_id)))
        resume = res.scalars().first()
        if resume and resume.parsed_data and "interview_hot_spots" in resume.parsed_data:
            hot_spots = resume.parsed_data["interview_hot_spots"]
            if hot_spots:
                greeting += f" I see from your resume that you have experience with {hot_spots[0].split()[0]}. Can you tell me more about your work in that area?"
            else:
                greeting += " Please briefly introduce yourself."
    else:
        greeting += " Please briefly introduce yourself."

    await db.commit()
    
    return {
        "session_id": str(session_id),
        "message": greeting
    }

@router.post("/chat", response_model=InterviewChatResponse)
async def chat_interview(
    request: InterviewChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Find session
    from sqlalchemy.future import select
    result = await db.execute(select(InterviewSession).where(InterviewSession.id == uuid.UUID(request.session_id), InterviewSession.user_id == current_user.id))
    interview = result.scalars().first()
    
    if not interview:
        raise HTTPException(status_code=404, detail="Interview session not found")
        
    user_answer = request.message
    prev_question = request.history[-1].content if request.history else "Please introduce yourself."
    
    # Evaluate Answer Quality
    quality_data = ml_models.classify_answer(prev_question, user_answer)
    quality_label = quality_data.get('label', 'Average')
    quality_score = quality_data.get('confidence', 0.5)
    
    # Compute Relevance
    relevance_score = ml_models.compute_relevance(prev_question, user_answer)
    
    # Generate Next Question
    next_question = ml_models.generate_question(
        role="Interviewer",
        topic=interview.job_role,
        prev_q=prev_question,
        answer=user_answer,
        quality=quality_label
    )
    
    return InterviewChatResponse(
        reply=next_question,
        quality_score=quality_score,
        relevance_score=relevance_score
    )

@router.post("/{session_id}/end")
async def end_interview(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from sqlalchemy.future import select
    result = await db.execute(select(InterviewSession).where(InterviewSession.id == uuid.UUID(session_id), InterviewSession.user_id == current_user.id))
    interview = result.scalars().first()
    
    if not interview:
        raise HTTPException(status_code=404, detail="Interview session not found")
        
    interview.status = "completed"
    interview.ended_at = datetime.now(timezone.utc)
    
    await db.commit()
    
    # Trigger Celery Task
    from app.tasks.interview_tasks import process_interview_report
    process_interview_report.delay(str(session_id))
    
    return {"message": "Session ended successfully"}

@router.get("/{session_id}")
async def get_interview(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from sqlalchemy.future import select
    result = await db.execute(select(InterviewSession).where(InterviewSession.id == uuid.UUID(session_id), InterviewSession.user_id == current_user.id))
    interview = result.scalars().first()
    
    if not interview:
        raise HTTPException(status_code=404, detail="Interview session not found")
        
    return {
        "id": str(interview.id),
        "job_role": interview.job_role,
        "status": interview.status,
        "overall_score": interview.overall_score,
        "feedback_report": interview.feedback_report,
        "report_url": interview.report_url,
        "created_at": interview.created_at,
        "ended_at": interview.ended_at
    }
