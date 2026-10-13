const mongoose = require('mongoose');

// One interviewer question + candidate answer (spec §20 interview_turns)
const interviewTurnSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'InterviewSession', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  sequence: { type: Number, required: true },
  phase: { type: String, required: true },
  strategy: { type: String, default: 'NEW_QUESTION' },
  topic: { type: String, default: null },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
  question: { type: String, required: true },
  questionPromptVersion: { type: String, default: null },
  questionModel: { type: String, default: null },
  // Reference pack used to grade the answer (spec §9 reference-concept evaluation)
  reference: {
    status: { type: String, enum: ['pending', 'ready', 'failed'], default: 'pending' },
    expectedConcepts: { type: [String], default: [] },
    requiredConcepts: { type: [String], default: [] },
    commonMistakes: { type: [String], default: [] },
    referenceAnswer: { type: String, default: '' },
    promptVersion: { type: String, default: null },
    model: { type: String, default: null }
  },
  answer: { type: String, default: null },
  askedAt: { type: Date, default: Date.now },
  answeredAt: { type: Date, default: null },
  // Observable speech/turn signals only (spec §14.3)
  speech: {
    inputMode: { type: String, enum: ['voice', 'text', null], default: null },
    speakingDurationMs: { type: Number, default: null },
    responseLatencyMs: { type: Number, default: null },
    interrupted: { type: Boolean, default: false },
    interruptionCount: { type: Number, default: 0 },
    fillerWordCount: { type: Number, default: 0 },
    wordCount: { type: Number, default: 0 }
  },
  evaluationStatus: { type: String, enum: ['none', 'pending', 'completed', 'insufficient', 'failed'], default: 'none', index: true },
  evaluationId: { type: mongoose.Schema.Types.ObjectId, ref: 'AnswerEvaluation', default: null },
  // Laya signals used to choose the counter-question strategy for the NEXT turn
  turnSignals: { type: Object, default: null },
  strategyReason: { type: String, default: null },
  masteryChange: { type: Object, default: null }
}, { timestamps: true });

interviewTurnSchema.index({ sessionId: 1, sequence: 1 }, { unique: true });

module.exports = mongoose.model('InterviewTurn', interviewTurnSchema);
