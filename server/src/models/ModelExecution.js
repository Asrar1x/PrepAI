const mongoose = require('mongoose');

// One row per AI call (spec §26 observability). Never stores student content.
const modelExecutionSchema = new mongoose.Schema({
  feature: { type: String, required: true, index: true },
  kind: { type: String, enum: ['generation', 'decision', 'embedding'], default: 'generation', index: true },
  provider: { type: String, default: '' },
  model: { type: String, default: '' },
  latencyMs: { type: Number, default: 0 },
  success: { type: Boolean, default: true, index: true },
  errorType: { type: String, default: null },
  retries: { type: Number, default: 0 },
  fallbackUsed: { type: Boolean, default: false },
  structuredOutputValid: { type: Boolean, default: null },
  promptTokens: { type: Number, default: 0 },
  completionTokens: { type: Number, default: 0 },
  confidence: { type: Number, default: null }
}, { timestamps: { createdAt: true, updatedAt: false } });

modelExecutionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ModelExecution', modelExecutionSchema);
