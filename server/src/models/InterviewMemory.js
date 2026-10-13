const mongoose = require('mongoose');

// Long-term interview memory (RAG): one row per evaluated answer plus one summary per session.
const interviewMemorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'InterviewSession', required: true, index: true },
  kind: { type: String, enum: ['answer', 'session'], required: true },
  topic: { type: String, default: null },
  question: { type: String, default: '' },
  answerExcerpt: { type: String, default: '' },
  score: { type: Number, default: null },
  verdict: { type: String, default: null },
  missingConcepts: { type: [String], default: [] },
  strengths: { type: [String], default: [] },
  incorrectClaims: { type: [String], default: [] },
  company: { type: String, default: null },
  interviewType: { type: String, default: null },
  // Text that was embedded, and its vector (absent when the embedding model was unavailable)
  text: { type: String, required: true },
  embedding: { type: [Number], default: undefined, select: false },
  embeddingModel: { type: String, default: null },
  occurredAt: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

interviewMemorySchema.index({ userId: 1, occurredAt: -1 });

module.exports = mongoose.model('InterviewMemory', interviewMemorySchema);
