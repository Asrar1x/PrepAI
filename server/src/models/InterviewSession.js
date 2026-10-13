const mongoose = require('mongoose');

const interviewSessionSchema = new mongoose.Schema({
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
  companyTarget: {
    type: String,
    default: 'General'
  },
  interviewType: {
    type: String,
    default: 'technical'
  },
  persona: {
    type: String,
    default: 'Technical Lead'
  },
  status: {
    type: String,
    enum: ['active', 'in_progress', 'completed', 'processing_report'],
    default: 'in_progress',
    index: true
  },
  livekitRoomId: {
    type: String,
    default: null
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  endedAt: {
    type: Date,
    default: null
  },
  durationSeconds: {
    type: Number,
    default: 0
  },
  turnCount: {
    type: Number,
    default: 0
  },
  transcript: {
    type: Array,
    default: []
  },
  overallScore: {
    type: Number,
    default: null
  },
  scoreBreakdown: {
    type: Object,
    default: null
  },
  feedbackReport: {
    type: Object,
    default: null
  },
  reportUrl: {
    type: String,
    default: null
  },
  resumeContext: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  shareToken: {
    type: String,
    default: null,
    index: true,
    sparse: true
  },
  xpAwarded: {
    type: Boolean,
    default: false
  },
  // v4 interview engine state (spec §11)
  engineVersion: { type: String, default: null },
  plan: { type: Array, default: [] },
  cursor: {
    phaseIndex: { type: Number, default: 0 },
    questionsAskedInPhase: { type: Number, default: 0 },
    followUpsForQuestion: { type: Number, default: 0 },
    finished: { type: Boolean, default: false }
  },
  currentPhaseId: { type: String, default: 'INTRODUCTION' },
  topicsCovered: { type: [String], default: [] },
  reportStatus: { type: String, enum: ['none', 'processing', 'ready', 'partial', 'failed'], default: 'none', index: true },
  reportError: { type: String, default: null },
  reportGeneratedAt: { type: Date, default: null }
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

module.exports = mongoose.model('InterviewSession', interviewSessionSchema);
