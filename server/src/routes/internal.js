/**
 * Internal AI endpoints (spec §21 Internal AI) — staff only.
 *   GET  /internal/ai/health      provider, embedding and Laya health
 *   GET  /internal/ai/models      configured models per role
 *   GET  /internal/ai/metrics     p50/p95 latency, failure/fallback/structured-output rates
 *   POST /internal/laya/decision  typed Laya decision (proxy to the Laya service)
 *   POST /internal/benchmarks/run queue a benchmark run (admin)
 *   GET  /internal/benchmarks     latest benchmark results
 */
const express = require('express');
const config = require('../config/env');
const { protect, requireRoles } = require('../middleware/auth');
const { providerFactory } = require('../services/providers/AIProviderFactory');
const layaClient = require('../services/layaClient');
const { getAiMetrics, audit } = require('../services/observability');
const { latestResults } = require('../services/benchmarkService');
const jobQueue = require('../services/jobQueue');

const router = express.Router();
const STAFF = ['admin', 'placement_officer', 'recruiter'];

router.use(protect, requireRoles(STAFF));

const ok = (req, res, data, code = 200) => res.status(code).json({ status: 'success', data, message: 'ok', request_id: req.requestId });

router.get('/ai/health', async (req, res) => {
  const [providers, laya] = await Promise.all([providerFactory.checkAllProviders(), layaClient.healthCheck()]);
  ok(req, res, {
    status: providers.status === 'operational' && laya.status === 'healthy' ? 'operational' : 'degraded',
    generation: providers,
    decision: laya,
    evaluatorVersion: config.evaluation.version
  });
});

router.get('/ai/models', (req, res) => {
  ok(req, res, {
    generation: providerFactory.listModels(),
    embedding: { provider: config.embeddings.provider, model: config.embeddings.model },
    decision: { provider: 'laya', model: config.laya.model, serviceUrl: config.laya.serviceUrl, enabled: config.laya.enabled },
    voice: config.voice,
    evaluation: { version: config.evaluation.version, weights: config.evaluation.weights }
  });
});

router.get('/ai/metrics', async (req, res) => {
  const hours = Math.min(24 * 90, Math.max(1, Number(req.query.hours) || 24 * 7));
  ok(req, res, { windowHours: hours, rows: await getAiMetrics({ sinceHours: hours }) });
});

router.post('/laya/decision', async (req, res) => {
  const { decision_type: decisionType, state } = req.body || {};
  if (!decisionType || !state || typeof state !== 'object') {
    return res.status(400).json({ status: 'error', message: 'decision_type and state are required', request_id: req.requestId });
  }
  const out = await layaClient.decide(decisionType, state, { feature: 'internal_laya_decision' });
  if (!out.available) return res.status(503).json({ status: 'error', message: out.reason, request_id: req.requestId });
  ok(req, res, out);
});

router.post('/benchmarks/run', requireRoles(['admin']), async (req, res) => {
  const model = typeof req.body.model === 'string' && req.body.model.trim() ? req.body.model.trim() : config.ai.evaluationModel;
  const limit = Number(req.body.limit) > 0 ? Math.min(120, Number(req.body.limit)) : null;
  const job = await jobQueue.enqueue('benchmark.run', { model, limit }, { priority: 9, maxAttempts: 1, dedupeKey: `bench:${model}:${limit || 'all'}` });
  await audit(req, 'benchmark.run_requested', { details: { model, limit } });
  ok(req, res, { jobId: job._id.toString(), model, limit, status: job.status }, 202);
});

router.get('/benchmarks', async (req, res) => {
  ok(req, res, await latestResults());
});

module.exports = router;
