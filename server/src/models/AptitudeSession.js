const mongoose = require('mongoose');

const aptitudeSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  jobRole: {
    type: String,
    default: 'Software Developer (SDE)'
  },
  companyPattern: {
    type: String,
    default: 'tcs'
  },
  mode: {
    type: String,
    default: 'adaptive'
  },
  durationMinutes: {
    type: Number,
    default: 15
  },
  totalQuestions: {
    type: Number,
    default: 0
  },
  correctCount: {
    type: Number,
    default: 0
  },
  wrongCount: {
    type: Number,
    default: 0
  },
  skippedCount: {
    type: Number,
    default: 0
  },
  score: {
    type: Number,
    default: 0
  },
  maxDifficultyReached: {
    type: String,
    default: 'medium'
  },
  categoryScores: {
    type: Map,
    of: Number,
    default: {}
  },
  weakTopics: {
    type: [String],
    default: []
  },
  questionsData: {
    type: Array,
    default: []
  },
  status: {
    type: String,
    enum: ['in_progress', 'completed'],
    default: 'in_progress'
  },
  completedAt: {
    type: Date,
    default: null
  },
  xpEarned: {
    type: Number,
    default: 0
  },
  lateAnswers: { type: Number, default: 0 },
  masteryChanges: { type: Array, default: [] }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (doc, ret) => {
      ret.id = ret._id.toString();
      delete ret.__v;
      return ret;
    }
  }
});

module.exports = mongoose.model('AptitudeSession', aptitudeSessionSchema);
