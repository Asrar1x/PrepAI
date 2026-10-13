const mongoose = require('mongoose');

// Per-topic mastery and difficulty state (spec §10, §20 topic_mastery)
const topicMasterySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  topic: { type: String, required: true, index: true },
  source: { type: String, enum: ['interview', 'aptitude'], default: 'interview', index: true },
  masteryScore: { type: Number, min: 0, max: 100, default: 0 },
  band: { type: String, enum: ['Beginner', 'Developing', 'Intermediate', 'Strong', 'Advanced'], default: 'Beginner' },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
  attemptsCount: { type: Number, default: 0 },
  attemptsAtDifficulty: { type: Number, default: 0 },
  consecutiveFailures: { type: Number, default: 0 },
  // Last results used for the recency-weighted average (newest last)
  recentResults: {
    type: [{
      score: Number,
      difficulty: String,
      conceptCoverage: Number,
      layaIncreaseDifficulty: String,
      at: Date
    }],
    default: []
  },
  // Audit trail of difficulty transitions with the rule that fired
  transitions: {
    type: [{ from: String, to: String, rule: String, mastery: Number, at: Date }],
    default: []
  },
  strengths: { type: [String], default: [] },
  weaknesses: { type: [String], default: [] },
  lastAssessedAt: { type: Date, default: Date.now }
}, { timestamps: true });

topicMasterySchema.index({ userId: 1, topic: 1, source: 1 }, { unique: true });

module.exports = mongoose.model('TopicMastery', topicMasterySchema);
