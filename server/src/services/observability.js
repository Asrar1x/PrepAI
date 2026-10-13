/**
 * AI observability: records every model call without student content and serves
 * p50/p95 latency, failure, fallback and structured-output metrics (spec §26).
 */
const ModelExecution = require('../models/ModelExecution');
const AuditLog = require('../models/AuditLog');

function classifyError(err) {
  const msg = String((err && err.message) || err || '').toLowerCase();
  if (msg.includes('timed out') || msg.includes('timeout')) return 'timeout';
  if (msg.includes('econnrefused') || msg.includes('fetch failed') || msg.includes('unavailable')) return 'unavailable';
  if (msg.includes('json') || msg.includes('schema')) return 'invalid_output';
  if (/http 4\d\d/.test(msg)) return 'client_error';
  if (/http 5\d\d/.test(msg)) return 'provider_error';
  return 'unknown';
}

async function recordExecution(entry) {
  try {
    await ModelExecution.create(entry);
  } catch (err) {
    // Observability must never break the request path
    console.warn('[Observability] Failed to record model execution:', err.message);
  }
}

function percentile(sorted, p) {
  if (!sorted.length) return null;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
}

async function getAiMetrics({ sinceHours = 24 * 7 } = {}) {
  const since = new Date(Date.now() - sinceHours * 3600000);
  const rows = await ModelExecution.find({ createdAt: { $gte: since } }, {
    feature: 1, kind: 1, provider: 1, model: 1, latencyMs: 1, success: 1, fallbackUsed: 1, structuredOutputValid: 1, errorType: 1, confidence: 1
  }).lean();

  const groups = new Map();
  rows.forEach(r => {
    const key = `${r.kind}|${r.feature}|${r.provider}|${r.model}`;
    const g = groups.get(key) || { kind: r.kind, feature: r.feature, provider: r.provider, model: r.model, latencies: [], total: 0, failures: 0, fallbacks: 0, structured: 0, structuredInvalid: 0, errors: {}, confidences: [] };
    g.total += 1;
    if (r.success) g.latencies.push(r.latencyMs);
    else {
      g.failures += 1;
      g.errors[r.errorType || 'unknown'] = (g.errors[r.errorType || 'unknown'] || 0) + 1;
    }
    if (r.fallbackUsed) g.fallbacks += 1;
    if (r.structuredOutputValid !== null && r.structuredOutputValid !== undefined) {
      g.structured += 1;
      if (!r.structuredOutputValid) g.structuredInvalid += 1;
    }
    if (typeof r.confidence === 'number') g.confidences.push(r.confidence);
    groups.set(key, g);
  });

  return Array.from(groups.values()).map(g => {
    const sorted = g.latencies.sort((a, b) => a - b);
    return {
      kind: g.kind,
      feature: g.feature,
      provider: g.provider,
      model: g.model,
      calls: g.total,
      failureRate: g.total ? Number((g.failures / g.total).toFixed(3)) : 0,
      fallbackRate: g.total ? Number((g.fallbacks / g.total).toFixed(3)) : 0,
      structuredOutputFailureRate: g.structured ? Number((g.structuredInvalid / g.structured).toFixed(3)) : null,
      latencyP50Ms: percentile(sorted, 50),
      latencyP95Ms: percentile(sorted, 95),
      meanConfidence: g.confidences.length ? Number((g.confidences.reduce((a, b) => a + b, 0) / g.confidences.length).toFixed(3)) : null,
      errors: g.errors
    };
  }).sort((a, b) => b.calls - a.calls);
}

async function audit(req, action, { targetType = null, targetId = null, details = {} } = {}) {
  try {
    await AuditLog.create({
      actorId: req && req.user ? req.user._id : null,
      actorRole: req && req.user ? req.user.role : null,
      action,
      targetType,
      targetId: targetId ? String(targetId) : null,
      requestId: req ? req.requestId : null,
      ip: req ? req.ip : null,
      details
    });
  } catch (err) {
    console.warn('[Audit] Failed to write audit log:', err.message);
  }
}

module.exports = { recordExecution, classifyError, getAiMetrics, audit, percentile };
