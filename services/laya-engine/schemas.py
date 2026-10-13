"""
Laya Decision Engine - typed request/response schemas (spec §8.2, §8.3).
"""

from typing import Dict, List, Optional
from pydantic import BaseModel, Field

DECISION_VERSION = "laya-decisions-v1"

# Allowed outputs per decision type (spec §8.2)
DECISION_LABELS: Dict[str, List[str]] = {
    "answer_state": ["CORRECT", "PARTIALLY_CORRECT", "INCORRECT", "IRRELEVANT", "INSUFFICIENT_EVIDENCE"],
    "relevance": ["HIGH", "MEDIUM", "LOW", "NONE"],
    "completeness": ["0", "1", "2", "3", "4", "5"],
    "concept_presence": ["YES", "NO", "UNCERTAIN"],
    "unsupported_claim": ["YES", "NO", "UNCERTAIN"],
    "followup_needed": ["YES", "NO", "UNCERTAIN"],
    "response_state": ["NORMAL", "NEEDS_CLARIFICATION", "STRUGGLING", "STRONG", "OFF_TOPIC", "TECHNICAL_ERROR"],
    "increase_difficulty": ["YES", "NO", "UNCERTAIN"],
}


# Size limits sit well above what the Node API sends (answers are capped at 6000 characters there);
# they stop an oversized request from tying up the CPU with thousands of model calls.
class DecisionState(BaseModel):
    question: str = Field(default="", max_length=4000)
    expected_concepts: List[str] = Field(default_factory=list, max_length=40)
    student_answer: str = Field(default="", max_length=8000)
    reference_context: Optional[str] = Field(default="", max_length=20000)
    concept: Optional[str] = Field(default=None, max_length=300)
    topic: Optional[str] = Field(default=None, max_length=300)
    mastery: Optional[float] = None
    recent_scores: List[float] = Field(default_factory=list, max_length=200)


class DecisionRequest(BaseModel):
    decision_type: str = Field(max_length=64)
    state: DecisionState


class DecisionResponse(BaseModel):
    decision_type: str
    decision: str
    probabilities: Dict[str, float] = Field(default_factory=dict)
    confidence: float
    confidence_tier: str
    expected_value: Optional[float] = None
    model: str
    decision_version: str = DECISION_VERSION
    latency_ms: float = 0.0


class ConceptDecision(BaseModel):
    concept: str
    decision: str
    probability: float


class BatchDecisionRequest(BaseModel):
    question: str = Field(max_length=4000)
    expected_concepts: List[str] = Field(default_factory=list, max_length=40)
    reference_context: Optional[str] = Field(default="", max_length=20000)
    student_answer: str = Field(max_length=8000)
    decisions: List[str] = Field(
        default_factory=lambda: ["answer_state", "relevance", "completeness", "unsupported_claim", "followup_needed", "response_state"],
        max_length=12,
    )
    include_concepts: bool = True


class BatchDecisionResponse(BaseModel):
    decisions: Dict[str, DecisionResponse]
    concepts: List[ConceptDecision] = Field(default_factory=list)
    model: str
    decision_version: str = DECISION_VERSION
    latency_ms: float


class ResumeExtractResponse(BaseModel):
    text: str
    page_count: int
    char_count: int
    extractor: str
    links: List[str] = Field(default_factory=list)
