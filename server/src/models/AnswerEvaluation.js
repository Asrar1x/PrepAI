const mongoose = require('mongoose');

// Final multi-signal evaluation of one answer (spec §9.2, §20 answer_evaluations)
const answerEvaluationSchema = new mongoose.Schema({
  turnId: { type: mongoose.Schema.Types.ObjectId, ref: 'InterviewTurn', index: true, default: null },
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'InterviewSession', index: true, default: null },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, default: null },
  status: { type: String, enum: ['completed', 'insufficient_evidence', 'failed'], required: true, index: true },
  failureReason: { type: String, default: null },
  topic: { type: String, default: null },
  difficulty: { type: String, default: null },
  classification: { type: String, default: null },
  confidence: { type: Number, default: null },
  dimensions: { type: Object, default: null },
  weights: { type: Object, required: true },
  overall: { type: Number, default: null },
  conceptAnalysis: { type: Array, default: [] },
  strengths: { type: [String], default: [] },
  missingConcepts: { type: [String], default: [] },
  incorrectClaims: { type: Array, default: [] },
  evidence: { type: [String], default: [] },
  improvementActions: { type: [String], default: [] },
  idealAnswer: { type: String, default: '' },
  followUpNeeded: { type: Boolean, default: null },
  reviewRequired: { type: Boolean, default: false, index: true },
  conflict: { type: Object, default: null },
  signalsAvailable: { type: Object, default: {} },
  evaluatorVersion: { type: String, required: true },
  promptVersion: { type: String, default: null },
  provider: { type: String, default: null },
  model: { type: String, default: null },
  latencyMs: { type: Number, default: null }
}, { timestamps: true });

module.exports = mongoose.model('AnswerEvaluation', answerEvaluationSchema);
