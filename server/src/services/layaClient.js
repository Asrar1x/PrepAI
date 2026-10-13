const config = require('../config/env');
const { recordExecution, classifyError } = require('./observability');

const LIMITS = { question: 4000, answer: 8000, context: 20000, concepts: 40, scores: 200 };
const clip = (v, max) => (typeof v === 'string' ? v.slice(0, max) : v || '');
function fitState(state = {}) {
  return {
    ...state,
    question: clip(state.question, LIMITS.question),
    student_answer: clip(state.student_answer, LIMITS.answer),
    reference_context: clip(state.reference_context, LIMITS.context),
    expected_concepts: Array.isArray(state.expected_concepts) ? state.expected_concepts.slice(0, LIMITS.concepts) : [],
    recent_scores: Array.isArray(state.recent_scores) ? state.recent_scores.slice(-LIMITS.scores) : []
  };
}

class LayaClient {
  constructor() {
    this.serviceUrl = config.laya.serviceUrl;
    this.enabled = config.laya.enabled;
    this.modelName = config.laya.model;
    this.timeoutMs = config.laya.timeoutMs;
  }

  async _post(path, body, timeoutMs) {
    const res = await fetch(`${this.serviceUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs || this.timeoutMs)
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`Laya HTTP ${res.status}: ${text.slice(0, 200)}`);
    return JSON.parse(text);
  }

  async healthCheck() {
    if (!this.enabled) return { status: 'disabled', enabled: false, model: this.modelName };
    try {
      const res = await fetch(`${this.serviceUrl}/health`, { signal: AbortSignal.timeout(3000) });
      const body = await res.json();
      return {
        status: body.status,
        enabled: true,
        modelReady: Boolean(body.model_ready),
        model: body.model_metadata?.model_name || this.modelName,
        device: body.model_metadata?.device,
        memoryMb: body.memory_mb,
        serviceUrl: this.serviceUrl
      };
    } catch (err) {
      return { status: 'unavailable', enabled: true, modelReady: false, model: this.modelName, error: err.message };
    }
  }

  async decide(decisionType, state, { feature = 'laya_decision', timeoutMs } = {}) {
    if (!this.enabled) return { available: false, reason: 'disabled' };
    const started = Date.now();
    try {
      const res = await this._post('/internal/laya/decision', { decision_type: decisionType, state: fitState(state) }, timeoutMs);
      recordExecution({ feature, kind: 'decision', provider: 'laya', model: res.model, latencyMs: Date.now() - started, success: true, confidence: res.confidence });
      return { available: true, ...res };
    } catch (err) {
      recordExecution({ feature, kind: 'decision', provider: 'laya', model: this.modelName, latencyMs: Date.now() - started, success: false, errorType: classifyError(err) });
      return { available: false, reason: err.message };
    }
  }

  /**

   * @returns {{available: boolean, decisions?: object, concepts?: Array, model?: string, decisionVersion?: string, latencyMs?: number, reason?: string}}
   */
  async decideBatch({ question, expectedConcepts = [], referenceContext = '', studentAnswer, decisions, includeConcepts = true }, { feature = 'laya_batch', timeoutMs } = {}) {
    if (!this.enabled) return { available: false, reason: 'disabled' };
    const started = Date.now();
    try {
      const body = {
        question: clip(question, LIMITS.question),
        expected_concepts: (expectedConcepts || []).slice(0, LIMITS.concepts),
        reference_context: clip(referenceContext, LIMITS.context),
        student_answer: clip(studentAnswer, LIMITS.answer),
        include_concepts: includeConcepts
      };
      if (decisions) body.decisions = decisions;
      const res = await this._post('/internal/laya/batch', body, timeoutMs);
      const conf = res.decisions?.answer_state?.confidence;
      recordExecution({ feature, kind: 'decision', provider: 'laya', model: res.model, latencyMs: Date.now() - started, success: true, confidence: typeof conf === 'number' ? conf : null });
      return {
        available: true,
        decisions: res.decisions,
        concepts: res.concepts || [],
        model: res.model,
        decisionVersion: res.decision_version,
        latencyMs: Date.now() - started
      };
    } catch (err) {
      recordExecution({ feature, kind: 'decision', provider: 'laya', model: this.modelName, latencyMs: Date.now() - started, success: false, errorType: classifyError(err) });
      return { available: false, reason: err.message };
    }
  }
  async extractResumeText(buffer, filename = 'resume.pdf') {
    const form = new FormData();
    form.append('file', new Blob([buffer], { type: 'application/pdf' }), filename);
    const res = await fetch(`${this.serviceUrl}/internal/resume/extract`, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(30000)
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(body.detail || `Resume extraction failed (HTTP ${res.status})`);
      err.status = res.status;
      throw err;
    }
    return body;
  }
}

module.exports = new LayaClient();
