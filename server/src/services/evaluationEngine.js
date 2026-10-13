/**
 * PrepAI multi-signal answer evaluation engine (spec §9, §33 MULTI-SIGNAL EVALUATION) — eval-v4.
 *
 * Pipeline:
 *   answer → input validation → reference concepts → embeddings ┐
 *                                                   → Laya      ├→ evidence verification
 *                                                   → LLM rubric┘   → conflict detection/resolution
 *   → deterministic weighted aggregation → persisted evaluation + raw signals
 *
 * Rules enforced here:
 *  - No answer-length or keyword-count scoring; similarity is never correctness.
 *  - Dimension scores come only from the rubric evaluator; if it fails, the evaluation is FAILED
 *    (visible + retryable) — never a fixed fallback score.
 *  - Laya/LLM disagreement is detected, resolved by an explicit policy or marked REVIEW_REQUIRED.
 *  - Evidence quotes that do not appear verbatim in the answer are discarded.
 */
const config = require('../config/env');
const { providerFactory } = require('./providers/AIProviderFactory');
const layaClient = require('./layaClient');
const { computeEmbeddingSignals } = require('./semanticEngine');
const { renderPrompt } = require('../prompts');
const { parseModelJson } = require('./jsonOutput');

const EVALUATOR_VERSION = config.evaluation.version;
const DEFAULT_RUBRIC_WEIGHTS = Object.freeze({ ...config.evaluation.weights });
const DIMENSIONS = Object.keys(DEFAULT_RUBRIC_WEIGHTS);
const CLASSIFICATIONS = ['CORRECT', 'PARTIALLY_CORRECT', 'INCORRECT', 'IRRELEVANT', 'INSUFFICIENT_EVIDENCE'];

// Ordinal used to measure how far apart two classifications are
const CLASS_RANK = { CORRECT: 3, PARTIALLY_CORRECT: 2, INSUFFICIENT_EVIDENCE: 1, INCORRECT: 0, IRRELEVANT: 0 };

// Answers that carry no evaluable content (validation, not scoring)
const NON_ANSWERS = [
  /^(i\s*)?(don'?t|do not|dont)\s+know\.?$/i, /^no idea\.?$/i, /^not sure\.?$/i, /^idk\.?$/i,
  /^pass\.?$/i, /^skip\.?$/i, /^next( question)?( please)?\.?$/i, /^(yes|no|ok|okay)\.?$/i
];

function validateRubricWeights(weights = DEFAULT_RUBRIC_WEIGHTS) {
  const keys = Object.keys(weights);
  if (keys.length !== DIMENSIONS.length || !DIMENSIONS.every(d => typeof weights[d] === 'number' && weights[d] >= 0)) {
    throw new Error('Invalid rubric configuration: every dimension needs a non-negative weight');
  }
  const sum = Object.values(weights).reduce((acc, w) => acc + w, 0);
  if (Math.abs(sum - 1.0) > 0.001) {
    throw new Error(`Invalid rubric configuration: weights must sum to 1.0, got ${sum}`);
  }
  return true;
}
validateRubricWeights();

/** Deterministic weighted aggregation (spec §9.1). */
function aggregateScore(dimensions, weights = DEFAULT_RUBRIC_WEIGHTS) {
  validateRubricWeights(weights);
  return Math.round(DIMENSIONS.reduce((acc, d) => acc + dimensions[d] * weights[d], 0));
}

/** Input validation: detects answers with no evaluable content. */
function validateAnswerInput(answer) {
  const text = String(answer || '').trim();
  if (!text) return { evaluable: false, reason: 'No answer was given.' };
  if (NON_ANSWERS.some(rx => rx.test(text))) return { evaluable: false, reason: 'The answer did not attempt the question.' };
  return { evaluable: true };
}

function normaliseForQuote(s) {
  return String(s || '').toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();
}

function isVerbatimQuote(quote, answer) {
  const q = normaliseForQuote(quote).replace(/^["']|["']$/g, '');
  return q.length >= 3 && normaliseForQuote(answer).includes(q);
}

/**
 * Validates and normalises the LLM rubric output. Returns null when the output does not match
 * the schema (that counts as a structured-output failure and triggers a retry).
 */
function normaliseLlmEvaluation(parsed, answer, referenceConcepts = []) {
  if (!parsed || typeof parsed !== 'object') return null;
  if (!CLASSIFICATIONS.includes(parsed.classification)) return null;
  const dims = parsed.dimensions || {};
  const dimensions = {};
  for (const d of DIMENSIONS) {
    const v = Number(dims[d]);
    if (!Number.isFinite(v)) return null;
    dimensions[d] = Math.max(0, Math.min(100, Math.round(v)));
  }
  const conf = Number(parsed.confidence);
  const asStrings = arr => (Array.isArray(arr) ? arr.filter(x => typeof x === 'string' && x.trim()).map(x => x.trim()) : []);

  // Evidence must be verbatim from the answer — anything else is discarded as invented
  const evidence = asStrings(parsed.evidence).filter(q => isVerbatimQuote(q, answer));
  const incorrectClaims = (Array.isArray(parsed.incorrectClaims) ? parsed.incorrectClaims : [])
    .map(c => (typeof c === 'string' ? { claim: c, correction: '' } : c))
    .filter(c => c && typeof c.claim === 'string' && isVerbatimQuote(c.claim, answer))
    .map(c => ({ claim: c.claim.trim(), correction: String(c.correction || '').trim() }));
  const conceptAnalysis = (Array.isArray(parsed.conceptAnalysis) ? parsed.conceptAnalysis : [])
    .filter(c => c && typeof c.concept === 'string')
    .map(c => {
      const quote = typeof c.evidence === 'string' && isVerbatimQuote(c.evidence, answer) ? c.evidence.trim() : '';
      let status = ['PRESENT', 'MISSING', 'INCORRECT'].includes(c.status) ? c.status : 'MISSING';
      // A concept cannot be marked present without a verbatim quote supporting it
      if (status === 'PRESENT' && !quote) status = 'UNVERIFIED';
      return { concept: c.concept.trim(), status, evidence: quote };
    });

  return {
    classification: parsed.classification,
    confidence: Number.isFinite(conf) ? Math.max(0, Math.min(1, conf)) : null,
    dimensions,
    conceptAnalysis: conceptAnalysis.length ? conceptAnalysis : referenceConcepts.map(concept => ({ concept, status: 'UNVERIFIED', evidence: '' })),
    strengths: asStrings(parsed.strengths).slice(0, 5),
    missingConcepts: asStrings(parsed.missingConcepts).slice(0, 6),
    incorrectClaims,
    evidence: evidence.slice(0, 5),
    improvementActions: asStrings(parsed.improvementActions).slice(0, 4),
    idealAnswer: typeof parsed.idealAnswer === 'string' ? parsed.idealAnswer.trim() : '',
    followUpNeeded: typeof parsed.followUpNeeded === 'boolean' ? parsed.followUpNeeded : null
  };
}

/** Combines concept evidence from the LLM (verbatim-verified) and Laya concept decisions. */
function mergeConceptEvidence(llmConcepts, layaConcepts = []) {
  const byName = new Map();
  llmConcepts.forEach(c => byName.set(c.concept.toLowerCase(), { concept: c.concept, llm: c.status, evidence: c.evidence, laya: null, layaProbability: null }));
  layaConcepts.forEach(c => {
    const key = c.concept.toLowerCase();
    const entry = byName.get(key) || { concept: c.concept, llm: null, evidence: '' };
    entry.laya = c.decision;
    entry.layaProbability = c.probability;
    byName.set(key, entry);
  });
  return Array.from(byName.values()).map(e => {
    let status;
    if (e.llm === 'INCORRECT') status = 'INCORRECT';
    else if (e.llm === 'PRESENT' && e.laya !== 'NO') status = 'PRESENT';
    else if (e.llm === 'PRESENT' && e.laya === 'NO') status = 'DISPUTED';
    else if ((e.llm === 'MISSING' || e.llm === null) && e.laya === 'YES') status = 'DISPUTED';
    else if (e.llm === 'UNVERIFIED' && e.laya === 'YES') status = 'PRESENT';
    else status = 'MISSING';
    return { ...e, status };
  });
}

/**
 * Conflict detection and resolution policy (spec §8.4, §33 MODEL DISAGREEMENT).
 * Adjacent classifications are not conflicts; a gap of ≥2 ranks with a confident Laya signal is.
 * Resolution uses reference-concept coverage and claim checks; otherwise REVIEW_REQUIRED.
 */
function resolveClassification({ llm, laya, concepts }) {
  const llmClass = llm.classification;
  const layaState = laya && laya.decisions && laya.decisions.answer_state;
  if (!layaState) {
    return { classification: llmClass, conflict: null, reviewRequired: false, confidence: llm.confidence };
  }
  const layaClass = layaState.decision;
  const gap = Math.abs(CLASS_RANK[llmClass] - CLASS_RANK[layaClass]);
  const layaConfident = layaState.confidence >= 0.4;
  const combinedConfidence = llm.confidence === null ? layaState.confidence : (llm.confidence + layaState.confidence) / 2;

  if (llmClass === layaClass || gap < 2 || !layaConfident) {
    return { classification: llmClass, conflict: null, reviewRequired: false, confidence: Number(combinedConfidence.toFixed(3)) };
  }

  // Evidence from reference concepts and claim checks
  const total = concepts.length;
  const present = concepts.filter(c => c.status === 'PRESENT').length;
  const coverage = total ? present / total : null;
  const layaClaim = laya.decisions.unsupported_claim;
  const claimFlag = llm.incorrectClaims.length > 0 || (layaClaim && layaClaim.decision === 'YES' && layaClaim.confidence >= 0.6);

  const positive = c => c === 'CORRECT' || c === 'PARTIALLY_CORRECT';
  const evidenceSupportsPositive = coverage !== null && coverage >= 0.6 && !claimFlag;
  const evidenceSupportsNegative = claimFlag || (coverage !== null && coverage < 0.34);

  let resolved = null;
  let rule = null;
  if (evidenceSupportsPositive && !evidenceSupportsNegative) {
    resolved = positive(llmClass) ? llmClass : layaClass;
    rule = 'concept_coverage_supports_positive';
  } else if (evidenceSupportsNegative && !evidenceSupportsPositive) {
    resolved = positive(llmClass) ? layaClass : llmClass;
    rule = claimFlag ? 'incorrect_claim_detected' : 'low_concept_coverage';
  }

  const conflict = {
    type: `${layaClass}_VS_${llmClass}`,
    layaClassification: layaClass,
    layaConfidence: layaState.confidence,
    llmClassification: llmClass,
    llmConfidence: llm.confidence,
    conceptCoverage: coverage,
    claimFlag,
    resolution: resolved ? 'RESOLVED' : 'REVIEW_REQUIRED',
    rule
  };
  return {
    classification: resolved || llmClass,
    conflict,
    reviewRequired: !resolved,
    // Disagreement lowers automated confidence
    confidence: Number((combinedConfidence * (resolved ? 0.75 : 0.5)).toFixed(3))
  };
}

/**
 * Consistency caps between the final classification and the dimension scores. These keep the
 * aggregated score coherent with the resolved verdict; they never raise a score.
 */
function applyClassificationCaps(dimensions, classification) {
  const d = { ...dimensions };
  if (classification === 'INCORRECT') {
    d.correctness = Math.min(d.correctness, 40);
  } else if (classification === 'IRRELEVANT') {
    d.relevance = Math.min(d.relevance, 25);
    d.correctness = Math.min(d.correctness, 30);
  } else if (classification === 'INSUFFICIENT_EVIDENCE') {
    d.correctness = Math.min(d.correctness, 25);
    d.completeness = Math.min(d.completeness, 25);
  }
  return d;
}

/** Laya completeness (0..5 expectation) is a second completeness signal, blended 70/30. */
function blendCompleteness(dimensions, laya) {
  const comp = laya && laya.decisions && laya.decisions.completeness;
  if (!comp || typeof comp.expected_value !== 'number') return dimensions;
  const layaPct = Math.round((comp.expected_value / 5) * 100);
  return { ...dimensions, completeness: Math.round(0.7 * dimensions.completeness + 0.3 * layaPct) };
}

async function runLlmEvaluation({ question, answer, role, topic, difficulty, reference, model = null }) {
  const prompt = renderPrompt('answer_evaluator');
  const user = [
    `Target role: ${role || 'Software Engineer'}`,
    `Topic: ${topic || 'General'} — difficulty: ${difficulty || 'Medium'}`,
    `Question: ${question}`,
    `Reference concepts: ${(reference.expectedConcepts || []).join('; ') || 'not supplied — judge against standard industry knowledge'}`,
    `Required concepts: ${(reference.requiredConcepts || []).join('; ') || 'none specified'}`,
    `Common mistakes: ${(reference.commonMistakes || []).join('; ') || 'none specified'}`,
    `Reference answer: ${reference.referenceAnswer || 'not supplied'}`,
    '',
    '<candidate_answer>',
    answer,
    '</candidate_answer>',
    '',
    'Return only the JSON object.'
  ].join('\n');

  let normalised = null;
  const result = await providerFactory.execute('answer_evaluation', async provider => provider.generate({
    system: prompt.text,
    prompt: user,
    temperature: 0.1,
    maxTokens: 1200,
    json: true,
    model: model || undefined
  }), {
    maxRetries: 1,
    validate: res => {
      normalised = normaliseLlmEvaluation(parseModelJson(res.text), answer, reference.expectedConcepts || []);
      return normalised !== null;
    }
  });
  return { evaluation: normalised, provider: result.provider, model: result.model, latencyMs: result.latencyMs, promptVersion: prompt.version, retries: result.retries };
}

/**
 * Evaluates one answer. Pure of persistence — callers store the result (see evaluationStore).
 * @returns {Promise<object>} evaluation following spec §9.2 plus `signals` with raw payloads.
 */
async function evaluateAnswer({ question, answer, role, topic = null, difficulty = 'Medium', reference = {}, weights = DEFAULT_RUBRIC_WEIGHTS, model = null }) {
  validateRubricWeights(weights);
  const started = Date.now();
  const base = {
    evaluatorVersion: EVALUATOR_VERSION,
    weights,
    topic,
    difficulty,
    timestamp: new Date().toISOString()
  };

  const validation = validateAnswerInput(answer);
  if (!validation.evaluable) {
    const dimensions = Object.fromEntries(DIMENSIONS.map(d => [d, 0]));
    return {
      ...base,
      status: 'insufficient_evidence',
      classification: 'INSUFFICIENT_EVIDENCE',
      confidence: 1,
      dimensions,
      overall: 0,
      conceptAnalysis: (reference.expectedConcepts || []).map(concept => ({ concept, status: 'MISSING', evidence: '' })),
      strengths: [],
      missingConcepts: reference.expectedConcepts || [],
      incorrectClaims: [],
      evidence: [],
      improvementActions: ['Attempt every question: explain what you do know about the topic, step by step.'],
      idealAnswer: reference.referenceAnswer || '',
      followUpNeeded: true,
      reviewRequired: false,
      conflict: null,
      failureReason: validation.reason,
      signals: { laya: null, llm: null, embedding: null },
      signalsAvailable: { laya: false, llm: false, embedding: false },
      provider: null,
      model: null,
      latencyMs: Date.now() - started
    };
  }

  const concepts = reference.expectedConcepts || [];
  const [llmOutcome, laya, embedding] = await Promise.all([
    runLlmEvaluation({ question, answer, role, topic, difficulty, reference, model: model || config.ai.evaluationModel }).catch(err => ({ error: err })),
    layaClient.decideBatch({
      question,
      expectedConcepts: concepts,
      referenceContext: reference.referenceAnswer || '',
      studentAnswer: answer
    }, { feature: 'answer_evaluation' }),
    computeEmbeddingSignals({ question, answer, referenceAnswer: reference.referenceAnswer || '', concepts })
  ]);

  const signals = {
    laya: laya.available ? { decisions: laya.decisions, concepts: laya.concepts, model: laya.model, decisionVersion: laya.decisionVersion, latencyMs: laya.latencyMs } : { unavailable: laya.reason },
    embedding: embedding.available ? embedding : { unavailable: embedding.reason },
    llm: llmOutcome.error ? { unavailable: llmOutcome.error.message } : { ...llmOutcome.evaluation, model: llmOutcome.model, provider: llmOutcome.provider, latencyMs: llmOutcome.latencyMs, retries: llmOutcome.retries }
  };
  const signalsAvailable = { laya: laya.available, llm: !llmOutcome.error, embedding: embedding.available };

  // Without the rubric evaluator there are no dimension scores — the evaluation fails visibly
  if (llmOutcome.error) {
    return {
      ...base,
      status: 'failed',
      failureReason: `Rubric evaluator unavailable: ${llmOutcome.error.message}`,
      classification: laya.available ? laya.decisions.answer_state.decision : null,
      confidence: null,
      dimensions: null,
      overall: null,
      conceptAnalysis: [],
      strengths: [],
      missingConcepts: [],
      incorrectClaims: [],
      evidence: [],
      improvementActions: [],
      idealAnswer: '',
      followUpNeeded: laya.available ? laya.decisions.followup_needed?.decision === 'YES' : null,
      reviewRequired: true,
      conflict: null,
      signals,
      signalsAvailable,
      provider: null,
      model: null,
      latencyMs: Date.now() - started
    };
  }

  const llm = llmOutcome.evaluation;
  const mergedConcepts = mergeConceptEvidence(llm.conceptAnalysis, laya.available ? laya.concepts : []);
  const resolution = resolveClassification({ llm, laya: laya.available ? laya : null, concepts: mergedConcepts });
  const dimensions = applyClassificationCaps(blendCompleteness(llm.dimensions, laya.available ? laya : null), resolution.classification);
  const overall = aggregateScore(dimensions, weights);

  const followUpNeeded = llm.followUpNeeded !== null
    ? llm.followUpNeeded
    : (laya.available ? laya.decisions.followup_needed?.decision === 'YES' : overall < 70);

  return {
    ...base,
    status: 'completed',
    failureReason: null,
    classification: resolution.classification,
    confidence: resolution.confidence,
    dimensions,
    overall,
    conceptAnalysis: mergedConcepts.map(c => ({ concept: c.concept, status: c.status, evidence: c.evidence, layaDecision: c.laya, layaProbability: c.layaProbability })),
    strengths: llm.strengths,
    missingConcepts: Array.from(new Set([...llm.missingConcepts, ...mergedConcepts.filter(c => c.status === 'MISSING').map(c => c.concept)])).slice(0, 6),
    incorrectClaims: llm.incorrectClaims,
    evidence: llm.evidence,
    improvementActions: llm.improvementActions,
    idealAnswer: llm.idealAnswer || reference.referenceAnswer || '',
    followUpNeeded,
    reviewRequired: resolution.reviewRequired,
    conflict: resolution.conflict,
    signals,
    signalsAvailable,
    promptVersion: llmOutcome.promptVersion,
    provider: llmOutcome.provider,
    model: llmOutcome.model,
    latencyMs: Date.now() - started
  };
}

module.exports = {
  EVALUATOR_VERSION,
  DEFAULT_RUBRIC_WEIGHTS,
  DIMENSIONS,
  CLASSIFICATIONS,
  validateRubricWeights,
  aggregateScore,
  validateAnswerInput,
  isVerbatimQuote,
  normaliseLlmEvaluation,
  mergeConceptEvidence,
  resolveClassification,
  applyClassificationCaps,
  blendCompleteness,
  evaluateAnswer
};
