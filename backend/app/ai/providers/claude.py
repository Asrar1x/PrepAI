import anthropic
import json
import logging
from typing import Dict, Any

from app.core.config import settings
from app.ai.prompts.interview import INTERVIEW_SYSTEM_PROMPT

logger = logging.getLogger(__name__)

async def generate_feedback_report(transcript: list, job_role: str) -> Dict[str, Any]:
    """Generate STAR-based feedback report using Claude."""
    if not settings.CLAUDE_API_KEY:
        logger.warning("CLAUDE_API_KEY missing, using mock feedback.")
        return {
            "overall_score": 85,
            "strengths": ["Clear communication", "Good technical knowledge"],
            "areas_for_improvement": ["Could provide more concrete examples", "Use STAR method more consistently"]
        }
        
    client = anthropic.AsyncAnthropic(api_key=settings.CLAUDE_API_KEY)
    
    prompt = f"""
    You are an expert technical interviewer and HR professional. Review the following interview transcript for a {job_role} position.
    Provide a detailed evaluation based on the STAR framework (Situation, Task, Action, Result).
    
    Transcript:
    {json.dumps(transcript, indent=2)}
    
    Format the response as a JSON object with:
    - overall_score (0-100)
    - strengths (list of strings)
    - areas_for_improvement (list of strings)
    - detailed_feedback (string)
    """
    
    try:
        response = await client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            system="You are an expert interviewer. Respond strictly with a valid JSON object.",
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        
        content = response.content[0].text
        # In a real app we'd safely parse json out of the block, assuming it's properly formatted here
        return json.loads(content)
        
    except Exception as e:
        logger.error(f"Error calling Claude: {e}")
        return {"error": "Failed to generate report"}
