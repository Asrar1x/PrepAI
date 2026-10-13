const mongoose = require('mongoose');

const questionBankSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
    index: true
  },
  subCategory: {
    type: String,
    default: 'General'
  },
  jobRole: {
    type: String,
    default: 'Software Developer (SDE)',
    index: true
  },
  companyTags: {
    type: [String],
    default: []
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium',
    index: true
  },
  questionText: {
    type: String,
    required: true
  },
  options: {
    type: [String],
    default: []
  },
  correctAnswer: {
    type: String,
    required: true
  },
  expectedKeyPoints: {
    type: [String],
    default: []
  },
  explanation: {
    type: String,
    default: ''
  },
  qualityScore: {
    type: Number,
    default: 1.0
  },
  timesUsed: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Question versioning (spec §12, §33 APTITUDE ENGINE): edits bump the version; attempts record it
  version: { type: Number, default: 1 },
  source: { type: String, enum: ['seed', 'admin_upload', 'generated'], default: 'seed' },
  // Numeric answers may be accepted within this absolute tolerance
  numericTolerance: { type: Number, default: null },
  // Explanation written by the generative model when the bank has none (never decides correctness)
  generatedExplanation: {
    steps: { type: [String], default: undefined },
    shortcut: { type: String, default: undefined },
    model: { type: String, default: undefined },
    promptVersion: { type: String, default: undefined }
  }
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

module.exports = mongoose.model('QuestionBank', questionBankSchema);
