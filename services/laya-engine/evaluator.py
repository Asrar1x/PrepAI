"""
Laya Decision Engine - evaluator.

Builds Laya's question dictionaries for each typed PrepAI decision and parses the
probabilities Laya returns. There is deliberately NO heuristic fallback: if the model is
not loaded or prediction fails, a LayaUnavailable error is raised so the caller records
the signal as missing instead of receiving invented decisions (spec §4 reliability).
"""

import time
import logging
from typing import Dict, List, Tuple

from model import get_laya_agent, get_model_status
from schemas import (
    DECISION_LABELS, DecisionState, DecisionResponse,
    BatchDecisionRequest, BatchDecisionResponse, ConceptDecision,
)

logger = logging.getLogger("laya-engine.evaluator")


class LayaUnavailable(RuntimeError):
    pass


class UnknownDecisionType(ValueError):
    pass


def confidence_tier(confidence: float) -> str:
    if confidence >= 0.70:
        return "HIGH"
    if confidence >= 0.45:
        return "MEDIUM"
    return "LOW"


QUESTION_DEFINITIONS: Dict[str, dict] = {
    "answer_state": {
        "type": "choice",
        "instructions": "Classify the technical correctness of the candidate answer to the interview question.",
        "criteria": {
            "CORRECT": "Accurate and addresses the question with sound technical content",
            "PARTIALLY_CORRECT": "Some accurate content but important concepts are missing or imprecise",
            "INCORRECT": "Contains wrong or impossible technical claims",
            "IRRELEVANT": "Does not address the question that was asked",
            "INSUFFICIENT_EVIDENCE": "Too brief, empty or evasive to judge",
        },
    },
    "relevance": {
        "type": "choice",
        "instructions": "How directly does the candidate answer address the interview question?",
        "criteria": {
            "HIGH": "Directly addresses the question",
            "MEDIUM": "Addresses the general area with tangents",
            "LOW": "Mostly tangential",
            "NONE": "Unrelated to the question",
        },
    },
    "completeness": {
        "type": "score",
        "instructions": "How completely does the candidate answer cover the expected concepts for this question?",
        "criteria": [
            "Level 0: Missing, empty or evasive",
            "Level 1: Superficial mention without explanation",
            "Level 2: Covers basics but omits key mechanisms",
            "Level 3: Covers the primary concepts adequately",
            "Level 4: Comprehensive coverage of mechanisms",
            "Level 5: Complete coverage including edge cases and trade-offs",
        ],
    },
    "unsupported_claim": {
        "type": "choice",
        "instructions": "Does the candidate answer contain a technical claim that is false or unsupported by computer science principles?",
        "criteria": {
            "YES": "Contains at least one false or unsupported technical claim",
            "NO": "All technical claims are accurate",
            "UNCERTAIN": "Claims cannot be verified from the text",
        },
    },
    "followup_needed": {
        "type": "choice",
        "instructions": "Should the interviewer ask a follow-up question to probe this answer further?",
        "criteria": {
            "YES": "The answer is vague, incomplete or questionable and needs probing",
            "NO": "The answer is clear and complete enough to move on",
            "UNCERTAIN": "Not clear whether a follow-up is needed",
        },
    },
    "response_state": {
        "type": "choice",
        "instructions": "Which state best describes the candidate's response in this interview turn?",
        "criteria": {
            "NORMAL": "Ordinary progression",
            "NEEDS_CLARIFICATION": "Vague statement that needs clarification",
            "STRUGGLING": "Candidate is struggling to answer",
            "STRONG": "Clear, accurate and deep answer",
            "OFF_TOPIC": "Candidate went off topic",
            "TECHNICAL_ERROR": "Answer contains an explicit technical error",
        },
    },
    "increase_difficulty": {
        "type": "choice",
        "instructions": "Given the candidate's mastery and recent scores, should the next question on this topic be harder?",
        "criteria": {
            "YES": "Stable competence shown; increase difficulty",
            "NO": "Keep or lower difficulty",
            "UNCERTAIN": "Not enough evidence",
        },
    },
}


def _concept_question(concept: str) -> dict:
    return {
        "type": "choice",
        "instructions": f"Does the candidate answer demonstrate the concept '{concept}'?",
        "criteria": {
            "YES": f"The answer explains or correctly uses {concept}",
            "NO": f"The answer does not address {concept}",
            "UNCERTAIN": f"The answer only vaguely touches {concept}",
        },
    }


def build_state_text(state: DecisionState) -> str:
    # Candidate text is enclosed in explicit delimiters: it is data, never instructions
    parts = [f"Question: {state.question}"]
    if state.expected_concepts:
        parts.append(f"Expected concepts: {', '.join(state.expected_concepts)}")
    if state.reference_context:
        parts.append(f"Reference: {state.reference_context}")
    if state.topic:
        parts.append(f"Topic: {state.topic}")
    if state.mastery is not None:
        parts.append(f"Topic mastery: {round(state.mastery)} / 100")
    if state.recent_scores:
        parts.append("Recent scores: " + ", ".join(str(round(s)) for s in state.recent_scores[-5:]))
    parts.append(f"<candidate_answer>\n{state.student_answer}\n</candidate_answer>")
    return "\n".join(parts)


def _parse(decision_type: str, raw: dict, model: str, latency_ms: float) -> DecisionResponse:
    labels = DECISION_LABELS.get(decision_type, [])
    probs = {str(k): round(float(v), 4) for k, v in (raw.get("probabilities") or {}).items()}
    if not probs:
        raise LayaUnavailable(f"Laya returned no probabilities for {decision_type}")
    if raw.get("type") == "score":
        # Score questions return an expected value on the 0..5 scale plus a distribution
        expected = float(raw.get("score", 0.0))
        decision = max(probs, key=probs.get)
        conf = float(probs[decision])
        return DecisionResponse(
            decision_type=decision_type, decision=decision, probabilities=probs,
            confidence=round(conf, 4), confidence_tier=confidence_tier(conf),
            expected_value=round(expected, 3), model=model, latency_ms=round(latency_ms, 1),
        )
    decision = str(raw.get("choice") or max(probs, key=probs.get))
    if labels and decision not in labels:
        raise LayaUnavailable(f"Laya returned label {decision!r} outside the {decision_type} schema")
    conf = float(probs.get(decision, raw.get("answer_confidence", 0.0)))
    return DecisionResponse(
        decision_type=decision_type, decision=decision, probabilities=probs,
        confidence=round(conf, 4), confidence_tier=confidence_tier(conf),
        model=model, latency_ms=round(latency_ms, 1),
    )


def _predict(state_text: str, questions: Dict[str, dict]) -> Tuple[dict, float]:
    agent = get_laya_agent()
    if agent is None:
        raise LayaUnavailable("Laya model is not loaded")
    started = time.time()
    try:
        result = agent.predict(state_text, questions=questions)
    except Exception as exc:  # model/runtime failure is surfaced, never masked
        logger.error("Laya prediction failed: %s", exc)
        raise LayaUnavailable(f"Laya prediction failed: {exc}") from exc
    return result.get("answers", {}), (time.time() - started) * 1000.0


def model_name() -> str:
    return get_model_status().get("model_name", "convaiinnovations/laya")


def decide(decision_type: str, state: DecisionState) -> DecisionResponse:
    if decision_type == "concept_presence":
        if not state.concept:
            raise UnknownDecisionType("concept_presence requires state.concept")
        questions = {"concept": _concept_question(state.concept)}
        answers, latency = _predict(build_state_text(state), questions)
        return _parse("concept_presence", answers.get("concept", {}), model_name(), latency)
    if decision_type not in QUESTION_DEFINITIONS:
        raise UnknownDecisionType(f"Unknown decision_type {decision_type!r}")
    answers, latency = _predict(build_state_text(state), {decision_type: QUESTION_DEFINITIONS[decision_type]})
    return _parse(decision_type, answers.get(decision_type, {}), model_name(), latency)


def decide_batch(req: BatchDecisionRequest) -> BatchDecisionResponse:
    """All requested decisions + per-concept presence in a single Laya forward pass."""
    unknown = [d for d in req.decisions if d not in QUESTION_DEFINITIONS]
    if unknown:
        raise UnknownDecisionType(f"Unknown decision types: {unknown}")
    state = DecisionState(
        question=req.question, expected_concepts=req.expected_concepts,
        student_answer=req.student_answer, reference_context=req.reference_context,
    )
    questions = {d: QUESTION_DEFINITIONS[d] for d in req.decisions}
    concept_keys: List[Tuple[str, str]] = []
    if req.include_concepts:
        for idx, concept in enumerate(req.expected_concepts or []):
            key = f"concept_{idx}"
            concept_keys.append((key, concept))
            questions[key] = _concept_question(concept)

    answers, latency = _predict(build_state_text(state), questions)
    name = model_name()
    decisions = {d: _parse(d, answers.get(d, {}), name, latency) for d in req.decisions}
    concepts = []
    for key, concept in concept_keys:
        parsed = _parse("concept_presence", answers.get(key, {}), name, latency)
        concepts.append(ConceptDecision(concept=concept, decision=parsed.decision, probability=parsed.confidence))
    return BatchDecisionResponse(decisions=decisions, concepts=concepts, model=name, latency_ms=round(latency, 1))
