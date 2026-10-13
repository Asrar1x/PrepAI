const mongoose = require('mongoose');

// Personalised study plan built from real performance data (spec §15.1, §20 study_plans)
const studyPlanSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  targetRole: { type: String, default: null },
  source: { type: String, enum: ['interview_report', 'performance', 'skill_gap'], default: 'performance' },
  sourceId: { type: String, default: null },
  status: { type: String, enum: ['active', 'archived'], default: 'active', index: true },
  items: {
    type: [{
      itemId: { type: String, required: true },
      topic: String,
      description: String,
      reason: String,
      durationMinutes: Number,
      priority: { type: String, enum: ['High', 'Normal'], default: 'Normal' },
      dueDate: Date,
      status: { type: String, enum: ['pending', 'done'], default: 'pending' },
      completedAt: Date
    }],
    default: []
  },
  generator: { type: String, default: 'deterministic-v1' }
}, { timestamps: true });

module.exports = mongoose.model('StudyPlan', studyPlanSchema);
