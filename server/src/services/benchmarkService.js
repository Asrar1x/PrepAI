/**
 * Evaluation benchmark (spec §28). Runs the real evaluation pipeline over the labelled dataset
 * and reports, per system (fusion, llm_only, laya_only):
 *   accuracy (3-class expert label), macro-F1, 5-class category accuracy, MAE and Pearson r
 *   against expert scores, in-range rate, false-positive / false-negative rates,
 *   run-to-run consistency, latency p50/p95, structured-output failure and conflict rates.
 * One fusion run yields all three systems because every evaluation stores its Laya and LLM signals.
 */
const crypto = require('crypto');
const path = require('path');
const config = require('../config/env');
const BenchmarkResult = require('../models/BenchmarkResult');
const { evaluateAnswer, aggregateScore, DEFAULT_RUBRIC_WEIGHTS } = require('./evaluationEngine');
const { percentile } = require('./observability');

const DATASET_PATH = path.join(__dirname, '../evals/benchmarkDataset100.json');
const DATASET_ID = 'prepai-eval-120-v1';

// Expert label (Pass/Moderate/Fail) ← classification
const TO_EXPERT = { CORRECT: 'Pass', PARTIALLY_CORRECT: 'Moderate', INCORRECT: 'Fail', IRRELEVANT: 'Fail', INSUFFICIENT_EVIDENCE: 'Fail' };
// Dataset category → expected 5-class classification
const CATEGORY_CLASS = {
  excellent_expert: 'CORRECT', correct: 'CORRECT', short_correct: 'CORRECT',
  partially_correct: 'PARTIALLY_CORRECT',
  incorrect: 'INCORRECT', hallucinated_claims: 'INCORRECT', long_incorrect: 'INCORRECT',
  irrelevant: 'IRRELEVANT', vague_evasive: 'INSUFFICIENT_EVIDENCE'
};

function loadDataset() {
  // eslint-disable-next-line global-require
  return require(DATASET_PATH);
}

function pearson(xs, ys) {
  const n = xs.length;
  if (n < 2) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    dx += (xs[i] - mx) ** 2;
    dy += (ys[i] - my) ** 2;
  }
  return dx && dy ? num / Math.sqrt(dx * dy) : null;
}

function macroF1(pairs, classes) {
  const f1s = classes.map(c => {
    const tp = pairs.filter(p => p.pred === c && p.gold === c).length;
    const fp = pairs.filter(p => p.pred === c && p.gold !== c).length;
    const fn = pairs.filter(p => p.pred !== c && p.gold === c).length;
    const precision = tp + fp ? tp / (tp + fp) : 0;
    const recall = tp + fn ? tp / (tp + fn) : 0;
    return precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
  });
  return f1s.reduce((a, b) => a + b, 0) / classes.length;
}

/**
 * @param {Array<{id, category, expertLabel, expertScore, acceptableRange, predClass, predScore, latencyMs, valid}>} items
 */
function computeMetrics(items) {
  const classified = items.filter(i => i.predClass);
  const pairs3 = classified.map(i => ({ gold: i.expertLabel, pred: TO_EXPERT[i.predClass] }));
  const pairs5 = classified.map(i => ({ gold: CATEGORY_CLASS[i.category], pred: i.predClass }));
  const scored = items.filter(i => typeof i.predScore === 'number');
  const errors = scored.map(i => Math.abs(i.predScore - i.expertScore));
  const inRange = scored.filter(i => Array.isArray(i.acceptableRange) && i.predScore >= i.acceptableRange[0] && i.predScore <= i.acceptableRange[1]).length;
  const goldFail = classified.filter(i => i.expertLabel === 'Fail');
  const goldPass = classified.filter(i => i.expertLabel === 'Pass');
  const latencies = items.map(i => i.latencyMs).filter(v => typeof v === 'number').sort((a, b) => a - b);

  const perCategory = {};
  items.forEach(i => {
    const c = perCategory[i.category] || { n: 0, correct3: 0, absErr: [], classified: 0 };
    c.n += 1;
    if (i.predClass) {
      c.classified += 1;
      if (TO_EXPERT[i.predClass] === i.expertLabel) c.correct3 += 1;
    }
    if (typeof i.predScore === 'number') c.absErr.push(Math.abs(i.predScore - i.expertScore));
    perCategory[i.category] = c;
  });

  return {
    metrics: {
      items: items.length,
      classified: classified.length,
      accuracy3: classified.length ? Number((pairs3.filter(p => p.gold === p.pred).length / classified.length).toFixed(3)) : null,
      macroF1_3: classified.length ? Number(macroF1(pairs3, ['Pass', 'Moderate', 'Fail']).toFixed(3)) : null,
      accuracy5: classified.length ? Number((pairs5.filter(p => p.gold === p.pred).length / classified.length).toFixed(3)) : null,
      macroF1_5: classified.length ? Number(macroF1(pairs5, ['CORRECT', 'PARTIALLY_CORRECT', 'INCORRECT', 'IRRELEVANT', 'INSUFFICIENT_EVIDENCE']).toFixed(3)) : null,
      mae: errors.length ? Number((errors.reduce((a, b) => a + b, 0) / errors.length).toFixed(2)) : null,
      pearsonR: scored.length > 2 ? Number((pearson(scored.map(i => i.predScore), scored.map(i => i.expertScore)) || 0).toFixed(3)) : null,
      inRangeRate: scored.length ? Number((inRange / scored.length).toFixed(3)) : null,
      // False positive: expert Fail judged Pass; false negative: expert Pass judged Fail
      falsePositiveRate: goldFail.length ? Number((goldFail.filter(i => TO_EXPERT[i.predClass] === 'Pass').length / goldFail.length).toFixed(3)) : null,
      falseNegativeRate: goldPass.length ? Number((goldPass.filter(i => TO_EXPERT[i.predClass] === 'Fail').length / goldPass.length).toFixed(3)) : null,
      latencyP50Ms: percentile(latencies, 50),
      latencyP95Ms: percentile(latencies, 95),
      structuredOutputFailureRate: items.length ? Number((items.filter(i => i.valid === false).length / items.length).toFixed(3)) : null,
      conflictRate: items.some(i => i.conflict !== undefined) ? Number((items.filter(i => i.conflict).length / items.length).toFixed(3)) : null,
      reviewRequiredRate: items.some(i => i.reviewRequired !== undefined) ? Number((items.filter(i => i.reviewRequired).length / items.length).toFixed(3)) : null
    },
    perCategory: Object.fromEntries(Object.entries(perCategory).map(([k, c]) => [k, {
      n: c.n,
      accuracy3: c.classified ? Number((c.correct3 / c.classified).toFixed(3)) : null,
      mae: c.absErr.length ? Number((c.absErr.reduce((a, b) => a + b, 0) / c.absErr.length).toFixed(2)) : null
    }]))
  };
}

function itemsFromEvaluation(sample, ev, latencyMs) {
  const base = { id: sample.id, category: sample.category, expertLabel: sample.expertLabel, expertScore: sample.expertScore, acceptableRange: sample.acceptableRange };
  const llm = ev.signals && ev.signals.llm && !ev.signals.llm.unavailable ? ev.signals.llm : null;
  const laya = ev.signals && ev.signals.laya && ev.signals.laya.decisions ? ev.signals.laya : null;
  return {
    fusion: { ...base, predClass: ev.status === 'failed' ? null : ev.classification, predScore: ev.overall, latencyMs, valid: ev.status !== 'failed', conflict: Boolean(ev.conflict), reviewRequired: Boolean(ev.reviewRequired) },
    llm_only: { ...base, predClass: llm ? llm.classification : null, predScore: llm ? aggregateScore(llm.dimensions, DEFAULT_RUBRIC_WEIGHTS) : null, latencyMs: llm ? llm.latencyMs : null, valid: Boolean(llm) },
    laya_only: { ...base, predClass: laya ? laya.decisions.answer_state.decision : null, predScore: null, latencyMs: laya ? laya.latencyMs : null, valid: Boolean(laya) }
  };
}

/**
 * Runs the benchmark for one generation model. Persists three BenchmarkResult rows
 * (fusion, llm_only, laya_only). `limit` restricts items (stratified by category) for quick runs.
 */
async function runBenchmark({ model = config.ai.evaluationModel, limit = null, consistencySample = 10, onProgress = null } = {}) {
  const dataset = loadDataset();
  let samples = dataset;
  if (limit && limit < dataset.length) {
    const byCat = new Map();
    dataset.forEach(d => byCat.set(d.category, [...(byCat.get(d.category) || []), d]));
    samples = [];
    let i = 0;
    while (samples.length < limit) {
      let added = false;
      for (const arr of byCat.values()) {
        if (arr[i] && samples.length < limit) { samples.push(arr[i]); added = true; }
      }
      if (!added) break;
      i += 1;
    }
  }

  const runId = crypto.randomBytes(6).toString('hex');
  const rows = {};
  for (const system of ['fusion', 'llm_only', 'laya_only']) {
    rows[system] = await BenchmarkResult.create({ runId, datasetId: DATASET_ID, datasetSize: samples.length, system, model: system === 'laya_only' ? config.laya.model : model, evaluatorVersion: config.evaluation.version });
  }
  const collected = { fusion: [], llm_only: [], laya_only: [] };
  const firstScores = new Map();

  try {
    for (let idx = 0; idx < samples.length; idx++) {
      const s = samples[idx];
      const started = Date.now();
      const ev = await evaluateAnswer({
        question: s.question,
        answer: s.candidateAnswer,
        role: 'Software Development Engineer',
        topic: s.topic,
        reference: { expectedConcepts: s.expectedConcepts, referenceAnswer: s.referenceAnswer },
        model
      });
      const per = itemsFromEvaluation(s, ev, Date.now() - started);
      Object.keys(collected).forEach(k => collected[k].push(per[k]));
      firstScores.set(s.id, { score: ev.overall, cls: ev.classification });
      if (onProgress) onProgress(idx + 1, samples.length, s.id, ev.classification, ev.overall);
    }

    // Run-to-run consistency on a fixed subset
    const subset = samples.filter((_, i) => i % Math.max(1, Math.floor(samples.length / consistencySample)) === 0).slice(0, consistencySample);
    const diffs = [];
    let sameClass = 0;
    for (const s of subset) {
      const ev = await evaluateAnswer({ question: s.question, answer: s.candidateAnswer, role: 'Software Development Engineer', topic: s.topic, reference: { expectedConcepts: s.expectedConcepts, referenceAnswer: s.referenceAnswer }, model });
      const first = firstScores.get(s.id);
      if (typeof ev.overall === 'number' && typeof first.score === 'number') diffs.push(Math.abs(ev.overall - first.score));
      if (ev.classification === first.cls) sameClass += 1;
    }
    const consistency = {
      sampleSize: subset.length,
      meanAbsScoreDiff: diffs.length ? Number((diffs.reduce((a, b) => a + b, 0) / diffs.length).toFixed(2)) : null,
      classAgreement: subset.length ? Number((sameClass / subset.length).toFixed(3)) : null
    };

    for (const system of Object.keys(collected)) {
      const { metrics, perCategory } = computeMetrics(collected[system]);
      if (system === 'fusion') metrics.consistency = consistency;
      Object.assign(rows[system], { status: 'completed', metrics, perCategory, items: collected[system], finishedAt: new Date() });
      await rows[system].save();
    }
    return { runId, model, results: Object.fromEntries(Object.entries(rows).map(([k, v]) => [k, v.metrics])) };
  } catch (err) {
    for (const r of Object.values(rows)) {
      r.status = 'failed';
      r.error = err.message;
      r.finishedAt = new Date();
      await r.save();
    }
    throw err;
  }
}

async function latestResults() {
  const latest = await BenchmarkResult.find({ status: 'completed' }).sort({ finishedAt: -1 }).limit(30);
  return latest.map(r => ({ runId: r.runId, system: r.system, model: r.model, datasetId: r.datasetId, datasetSize: r.datasetSize, evaluatorVersion: r.evaluatorVersion, metrics: r.metrics, perCategory: r.perCategory, finishedAt: r.finishedAt }));
}

module.exports = { DATASET_ID, TO_EXPERT, CATEGORY_CLASS, computeMetrics, pearson, macroF1, runBenchmark, latestResults };
