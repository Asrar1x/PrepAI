const mongoose = require('mongoose');

// Persisted background job (stands in for Celery on this single-node deployment, spec §25)
const jobSchema = new mongoose.Schema({
  type: { type: String, required: true, index: true },
  payload: { type: Object, default: {} },
  status: { type: String, enum: ['queued', 'running', 'done', 'failed'], default: 'queued', index: true },
  priority: { type: Number, default: 5 }, // lower runs first
  attempts: { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 3 },
  runAfter: { type: Date, default: Date.now, index: true },
  lastError: { type: String, default: null },
  dedupeKey: { type: String, default: null, index: true },
  startedAt: { type: Date, default: null },
  finishedAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Job', jobSchema);
