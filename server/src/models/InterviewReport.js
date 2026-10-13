const mongoose = require('mongoose');

// Generated interview report (spec §15, §20 interview_reports)
const interviewReportSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'InterviewSession', required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: { type: String, enum: ['ready', 'partial', 'failed'], required: true },
  evaluatorVersion: { type: String, required: true },
  payload: { type: Object, required: true }
}, { timestamps: true });

module.exports = mongoose.model('InterviewReport', interviewReportSchema);
