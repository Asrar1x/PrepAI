const mongoose = require('mongoose');

// Benchmark run of one system on the labelled dataset (spec §28, §20 benchmark_results)
const benchmarkResultSchema = new mongoose.Schema({
  runId: { type: String, required: true, index: true },
  datasetId: { type: String, required: true },
  datasetSize: { type: Number, required: true },
  system: { type: String, required: true }, // fusion | llm_only | laya_only
  model: { type: String, default: null },
  evaluatorVersion: { type: String, default: null },
  status: { type: String, enum: ['running', 'completed', 'failed'], default: 'running' },
  metrics: { type: Object, default: {} },
  perCategory: { type: Object, default: {} },
  items: { type: Array, default: [] },
  error: { type: String, default: null },
  startedAt: { type: Date, default: Date.now },
  finishedAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('BenchmarkResult', benchmarkResultSchema);
