/**
 * Persists evaluations and their raw signals (spec §20 answer_evaluations, evaluation_signals).
 */
const AnswerEvaluation = require('../models/AnswerEvaluation');
const EvaluationSignal = require('../models/EvaluationSignal');

async function saveEvaluation(result, { turnId = null, sessionId = null, userId = null } = {}) {
  // One evaluation per answer: a retry or re-grade replaces the earlier result (and its signals)
  // instead of adding a duplicate that report aggregates would count twice
  if (turnId) {
    const previous = await AnswerEvaluation.find({ turnId }, { _id: 1 });
    if (previous.length) {
      const ids = previous.map(p => p._id);
      await EvaluationSignal.deleteMany({ evaluationId: { $in: ids } });
      await AnswerEvaluation.deleteMany({ _id: { $in: ids } });
    }
  }
  const doc = await AnswerEvaluation.create({
    turnId,
    sessionId,
    userId,
    status: result.status,
    failureReason: result.failureReason || null,
    topic: result.topic,
    difficulty: result.difficulty,
    classification: result.classification,
    confidence: result.confidence,
    dimensions: result.dimensions,
    weights: result.weights,
    overall: result.overall,
    conceptAnalysis: result.conceptAnalysis,
    strengths: result.strengths,
    missingConcepts: result.missingConcepts,
    incorrectClaims: result.incorrectClaims,
    evidence: result.evidence,
    improvementActions: result.improvementActions,
    idealAnswer: result.idealAnswer,
    followUpNeeded: result.followUpNeeded,
    reviewRequired: result.reviewRequired,
    conflict: result.conflict,
    signalsAvailable: result.signalsAvailable,
    evaluatorVersion: result.evaluatorVersion,
    promptVersion: result.promptVersion || null,
    provider: result.provider,
    model: result.model,
    latencyMs: result.latencyMs
  });

  const signals = result.signals || {};
  const rows = [];
  if (signals.laya) rows.push({ signalType: 'laya', available: !signals.laya.unavailable, model: signals.laya.model || null, confidence: signals.laya.decisions?.answer_state?.confidence ?? null, latencyMs: signals.laya.latencyMs ?? null, payload: signals.laya });
  if (signals.llm) rows.push({ signalType: 'llm', available: !signals.llm.unavailable, model: signals.llm.model || null, confidence: signals.llm.confidence ?? null, latencyMs: signals.llm.latencyMs ?? null, payload: signals.llm });
  if (signals.embedding) rows.push({ signalType: 'embedding', available: !signals.embedding.unavailable, model: signals.embedding.model || null, latencyMs: signals.embedding.latencyMs ?? null, payload: signals.embedding });
  if (rows.length) await EvaluationSignal.insertMany(rows.map(r => ({ ...r, evaluationId: doc._id })));
  return doc;
}

module.exports = { saveEvaluation };
