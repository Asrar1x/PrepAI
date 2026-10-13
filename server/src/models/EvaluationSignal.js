const mongoose = require('mongoose');

// Raw Laya / LLM / embedding signals behind an evaluation (spec §20 evaluation_signals)
const evaluationSignalSchema = new mongoose.Schema({
  evaluationId: { type: mongoose.Schema.Types.ObjectId, ref: 'AnswerEvaluation', required: true, index: true },
  signalType: { type: String, enum: ['laya', 'llm', 'embedding'], required: true },
  available: { type: Boolean, default: true },
  model: { type: String, default: null },
  confidence: { type: Number, default: null },
  latencyMs: { type: Number, default: null },
  payload: { type: Object, default: {} }
}, { timestamps: { createdAt: true, updatedAt: false } });

module.exports = mongoose.model('EvaluationSignal', evaluationSignalSchema);
