const mongoose = require('mongoose');

// One answer to one aptitude question, timed by the server (spec §12.1, §20 aptitude_attempts)
const aptitudeAttemptSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'AptitudeSession', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'QuestionBank', required: true },
  questionVersion: { type: Number, default: 1 },
  category: { type: String, default: null },
  difficulty: { type: String, default: null },
  selectedOption: { type: String, default: null },
  selectedAnswer: { type: String, default: null },
  correct: { type: Boolean, default: false },
  durationMs: { type: Number, default: null },
  answeredAt: { type: Date, default: Date.now },
  afterDeadline: { type: Boolean, default: false }
}, { timestamps: true });

aptitudeAttemptSchema.index({ sessionId: 1, questionId: 1 }, { unique: true });

module.exports = mongoose.model('AptitudeAttempt', aptitudeAttemptSchema);
