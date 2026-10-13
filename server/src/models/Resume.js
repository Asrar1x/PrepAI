const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  filename: {
    type: String,
    required: true
  },
  fileUrl: {
    type: String,
    default: ''
  },
  rawText: {
    type: String,
    default: ''
  },
  parsedSkills: {
    type: [String],
    default: []
  },
  atsScore: {
    type: Number,
    default: null
  },
  storageKey: { type: String, default: null },
  parsed: { type: mongoose.Schema.Types.Mixed, default: null },
  extraction: { type: mongoose.Schema.Types.Mixed, default: null },
  analysisVersion: { type: String, default: null },
  domainFit: {
    type: String,
    default: null
  },
  recommendations: {
    type: [String],
    default: []
  },
  diagnosticData: {
    type: mongoose.Schema.Types.Mixed,
    default: null
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

module.exports = mongoose.model('Resume', resumeSchema);
