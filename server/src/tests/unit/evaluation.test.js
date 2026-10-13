require('./setup');
const test = require('node:test');
const assert = require('node:assert/strict');
const ev = require('../../services/evaluationEngine');
const { providerFactory } = require('../../services/providers/AIProviderFactory');
const layaClient = require('../../services/layaClient');

const ANSWER = 'A process is a program in execution. The OS tracks it with a PCB that stores its state.';
const llmJson = (overrides = {}) => JSON.stringify({
  classification: 'CORRECT',
  confidence: 0.9,
  dimensions: { correctness: 90, relevance: 90, technicalDepth: 70, completeness: 80, reasoning: 75, clarity: 85, communication: 85 },
  conceptAnalysis: [{ concept: 'PCB', status: 'PRESENT', evidence: 'tracks it with a PCB' }],
  strengths: ['Defined a process correctly'],
  missingConcepts: [],
  incorrectClaims: [],
  evidence: ['A process is a program in execution.'],
  improvementActions: ['Mention process states'],
  idealAnswer: 'A process is a program in execution...',
  followUpNeeded: false,
  ...overrides
});

test('weights: default weights are valid and sum to 1.0', () => {
  assert.equal(ev.validateRubricWeights(), true);
  const sum = Object.values(ev.DEFAULT_RUBRIC_WEIGHTS).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum - 1) < 1e-9);
});

test('weights: invalid sums and missing dimensions are rejected', () => {
  assert.throws(() => ev.validateRubricWeights({ ...ev.DEFAULT_RUBRIC_WEIGHTS, correctness: 0.5 }), /sum to 1.0/);
  assert.throws(() => ev.validateRubricWeights({ correctness: 1 }), /every dimension/);
});

test('aggregation: overall is the deterministic weighted sum', () => {
  const dims = { correctness: 80, relevance: 60, technicalDepth: 40, completeness: 100, reasoning: 50, clarity: 70, communication: 90 };
  const expected = Math.round(80 * 0.25 + 60 * 0.15 + 40 * 0.15 + 100 * 0.15 + 50 * 0.1 + 70 * 0.1 + 90 * 0.1);
  assert.equal(ev.aggregateScore(dims), expected);
});

test('input validation: empty and non-answers are not evaluable; short real answers are', () => {
  assert.equal(ev.validateAnswerInput('').evaluable, false);
  assert.equal(ev.validateAnswerInput("I don't know").evaluable, false);
  assert.equal(ev.validateAnswerInput('pass').evaluable, false);
  // A short but substantive answer is evaluable — length is not a scoring factor
  assert.equal(ev.validateAnswerInput('Program in execution with a PCB.').evaluable, true);
});

test('evidence: quotes not present verbatim in the answer are discarded', () => {
  const n = ev.normaliseLlmEvaluation(JSON.parse(llmJson({
    evidence: ['A process is a program in execution.', 'invented quote that the student never said'],
    incorrectClaims: [{ claim: 'never said this', correction: 'x' }]
  })), ANSWER, ['PCB']);
  assert.deepEqual(n.evidence, ['A process is a program in execution.']);
  assert.equal(n.incorrectClaims.length, 0);
});

test('evidence: a concept marked PRESENT without a verbatim quote becomes UNVERIFIED', () => {
  const n = ev.normaliseLlmEvaluation(JSON.parse(llmJson({ conceptAnalysis: [{ concept: 'scheduler', status: 'PRESENT', evidence: 'the scheduler' }] })), ANSWER, []);
  assert.equal(n.conceptAnalysis[0].status, 'UNVERIFIED');
});

test('schema: malformed evaluator output is rejected (never a silent fixed score)', () => {
  assert.equal(ev.normaliseLlmEvaluation({ classification: 'GREAT' }, ANSWER), null);
  assert.equal(ev.normaliseLlmEvaluation(JSON.parse(llmJson({ dimensions: { correctness: 'high' } })), ANSWER), null);
  assert.equal(ev.normaliseLlmEvaluation(null, ANSWER), null);
});

test('conflict: agreement and adjacent classes are not conflicts', () => {
  const llm = { classification: 'CORRECT', confidence: 0.8, incorrectClaims: [] };
  const laya = c => ({ decisions: { answer_state: { decision: c, confidence: 0.7 } } });
  assert.equal(ev.resolveClassification({ llm, laya: laya('CORRECT'), concepts: [] }).conflict, null);
  assert.equal(ev.resolveClassification({ llm, laya: laya('PARTIALLY_CORRECT'), concepts: [] }).conflict, null);
});

test('conflict: contradiction resolved by evidence (incorrect claim) is recorded, not hidden', () => {
  const llm = { classification: 'INCORRECT', confidence: 0.8, incorrectClaims: [{ claim: 'x', correction: 'y' }] };
  const laya = { decisions: { answer_state: { decision: 'CORRECT', confidence: 0.6 } } };
  const r = ev.resolveClassification({ llm, laya, concepts: [{ status: 'MISSING' }] });
  assert.equal(r.classification, 'INCORRECT');
  assert.equal(r.conflict.resolution, 'RESOLVED');
  assert.equal(r.conflict.type, 'CORRECT_VS_INCORRECT');
  assert.equal(r.reviewRequired, false);
  assert.ok(r.confidence < 0.8);
});

test('conflict: unresolvable disagreement is marked REVIEW_REQUIRED', () => {
  const llm = { classification: 'CORRECT', confidence: 0.9, incorrectClaims: [] };
  const laya = { decisions: { answer_state: { decision: 'INCORRECT', confidence: 0.8 } } };
  const r = ev.resolveClassification({ llm, laya, concepts: [{ status: 'PRESENT' }, { status: 'MISSING' }] });
  assert.equal(r.reviewRequired, true);
  assert.equal(r.conflict.resolution, 'REVIEW_REQUIRED');
});

test('caps: classification caps never raise a dimension', () => {
  const dims = { correctness: 20, relevance: 90, technicalDepth: 10, completeness: 10, reasoning: 10, clarity: 10, communication: 10 };
  const capped = ev.applyClassificationCaps(dims, 'INCORRECT');
  for (const k of Object.keys(dims)) assert.ok(capped[k] <= dims[k]);
  assert.equal(ev.applyClassificationCaps({ ...dims, correctness: 95 }, 'INCORRECT').correctness, 40);
});

test('pipeline: evaluator failure yields a FAILED evaluation with no scores (no fabricated fallback)', async t => {
  t.mock.method(providerFactory, 'execute', async () => {
    const e = new Error('provider down');
    e.code = 'AI_UNAVAILABLE';
    throw e;
  });
  t.mock.method(providerFactory, 'embed', async () => { throw new Error('embedding down'); });
  t.mock.method(layaClient, 'decideBatch', async () => ({ available: false, reason: 'down' }));
  const r = await ev.evaluateAnswer({ question: 'What is a process?', answer: ANSWER, reference: { expectedConcepts: ['PCB'] } });
  assert.equal(r.status, 'failed');
  assert.equal(r.overall, null);
  assert.equal(r.dimensions, null);
  assert.equal(r.reviewRequired, true);
  assert.equal(r.signalsAvailable.llm, false);
});

test('pipeline: successful evaluation combines signals and aggregates deterministically', async t => {
  t.mock.method(providerFactory, 'execute', async (feature, task, opts) => {
    const res = { text: llmJson(), model: 'mock-model', provider: 'mock', latencyMs: 5 };
    assert.equal(opts.validate(res), true);
    return { ...res, retries: 0 };
  });
  t.mock.method(providerFactory, 'embed', async () => { throw new Error('embedding down'); });
  t.mock.method(layaClient, 'decideBatch', async () => ({
    available: true,
    model: 'convaiinnovations/laya',
    decisionVersion: 'laya-decisions-v1',
    latencyMs: 3,
    decisions: {
      answer_state: { decision: 'CORRECT', confidence: 0.7 },
      completeness: { decision: '4', expected_value: 4, confidence: 0.6 },
      followup_needed: { decision: 'NO', confidence: 0.6 }
    },
    concepts: [{ concept: 'PCB', decision: 'YES', probability: 0.8 }]
  }));
  const r = await ev.evaluateAnswer({ question: 'What is a process?', answer: ANSWER, reference: { expectedConcepts: ['PCB'] } });
  assert.equal(r.status, 'completed');
  assert.equal(r.classification, 'CORRECT');
  assert.equal(r.conflict, null);
  // completeness blended 70/30 with Laya's 4/5: round(0.7*80 + 0.3*80) = 80
  assert.equal(r.dimensions.completeness, 80);
  assert.equal(r.overall, ev.aggregateScore(r.dimensions));
  assert.equal(r.evaluatorVersion, ev.EVALUATOR_VERSION);
  assert.equal(r.signalsAvailable.embedding, false);
  assert.equal(r.conceptAnalysis[0].status, 'PRESENT');
});

test('pipeline: a non-answer is INSUFFICIENT_EVIDENCE without calling any model', async t => {
  const exec = t.mock.method(providerFactory, 'execute', async () => { throw new Error('should not be called'); });
  const r = await ev.evaluateAnswer({ question: 'What is a process?', answer: "I don't know" });
  assert.equal(r.status, 'insufficient_evidence');
  assert.equal(r.overall, 0);
  assert.equal(exec.mock.callCount(), 0);
});
