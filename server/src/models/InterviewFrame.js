const mongoose = require('mongoose');

// One webcam frame captured during an interview. The image is kept only until it is analysed.
const interviewFrameSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'InterviewSession', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  seq: { type: Number, required: true },
  offsetSec: { type: Number, default: 0 },
  capturedAt: { type: Date, default: Date.now },
  image: { type: Buffer, default: null, select: false },
  status: { type: String, enum: ['pending', 'analysed', 'failed'], default: 'pending', index: true },
  analysis: { type: Object, default: null },
  failureReason: { type: String, default: null },
  model: { type: String, default: null },
  promptVersion: { type: String, default: null },
  latencyMs: { type: Number, default: null }
}, { timestamps: true });

interviewFrameSchema.index({ sessionId: 1, seq: 1 }, { unique: true });

module.exports = mongoose.model('InterviewFrame', interviewFrameSchema);
