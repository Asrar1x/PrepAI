require('./setup');
const test = require('node:test');
const assert = require('node:assert/strict');

const mastery = require('../../services/adaptiveEngine');
const sm = require('../../services/interviewStateMachine');
const apt = require('../../services/aptitudeService');
const resume = require('../../services/resumeService');
const bench = require('../../services/benchmarkService');
const { cosineSimilarity } = require('../../services/semanticEngine');
const { TokenBucket } = require('../../middleware/rateLimiter');
const { scrubPII } = require('../../services/aiService');
const { stripReasoning } = require('../../services/providers/AIProvider');
const { parseModelJson } = require('../../services/jsonOutput');
const { countFillers } = require('../../services/interviewService');
const { communicationStats } = require('../../services/reportService');

// ---------------- Mastery & difficulty (spec §10) ----------------
test('mastery: bands follow the spec thresholds', () => {
  assert.equal(mastery.bandFor(0).band, 'Beginner');
  assert.equal(mastery.bandFor(30).band, 'Beginner');
  assert.equal(mastery.bandFor(31).band, 'Developing');
  assert.equal(mastery.bandFor(51).band, 'Intermediate');
  assert.equal(mastery.bandFor(71).band, 'Strong');
  assert.equal(mastery.bandFor(86).band, 'Advanced');
});

test('mastery: recency-weighted average favours recent results', () => {
  assert.equal(mastery.recencyWeightedAverage([0, 100]), 200 / 3);
  assert.equal(mastery.recencyWeightedAverage([]), null);
});

test('mastery: first result seeds mastery; later results are smoothed (alpha 0.4)', () => {
  const first = mastery.computeMasteryUpdate({ masteryScore: 0, attemptsCount: 0, recentResults: [], difficulty: 'Medium' }, { score: 70, difficulty: 'Medium' });
  assert.equal(first.masteryScore, 70);
  const second = mastery.computeMasteryUpdate({ ...first, recentResults: first.recentResults }, { score: 40, difficulty: 'Medium' });
  // recent = (70*1 + 40*2)/3 = 50; smoothed = 0.4*50 + 0.6*70 = 62
  assert.equal(second.masteryScore, 62);
});

test('difficulty: a single lucky answer does not increase difficulty', () => {
  const r = mastery.nextDifficulty({ current: 'Medium', mastery: 90, recentScore: 95, consecutiveFailures: 0, attemptsAtDifficulty: 1 });
  assert.equal(r.difficulty, 'Medium');
  assert.equal(r.rule, 'hold');
});

test('difficulty: stable competence increases, repeated failure decreases, otherwise hold', () => {
  assert.equal(mastery.nextDifficulty({ current: 'Medium', mastery: 85, recentScore: 80, consecutiveFailures: 0, attemptsAtDifficulty: 2 }).difficulty, 'Hard');
  assert.equal(mastery.nextDifficulty({ current: 'Medium', mastery: 60, recentScore: 30, consecutiveFailures: 2, attemptsAtDifficulty: 1 }).difficulty, 'Easy');
  assert.equal(mastery.nextDifficulty({ current: 'Medium', mastery: 35, recentScore: 60, consecutiveFailures: 0, attemptsAtDifficulty: 1 }).difficulty, 'Easy');
  assert.equal(mastery.nextDifficulty({ current: 'Hard', mastery: 95, recentScore: 95, consecutiveFailures: 0, attemptsAtDifficulty: 5 }).difficulty, 'Hard');
  assert.equal(mastery.nextDifficulty({ current: 'Medium', mastery: 65, recentScore: 70, consecutiveFailures: 0, attemptsAtDifficulty: 4 }).rule, 'hold');
});

test('difficulty: alternating scores do not oscillate easy-hard-easy', () => {
  let state = { masteryScore: 0, attemptsCount: 0, recentResults: [], difficulty: 'Medium', attemptsAtDifficulty: 0, consecutiveFailures: 0 };
  const levels = [];
  for (const score of [90, 40, 90, 40, 90, 40]) {
    state = { ...state, ...mastery.computeMasteryUpdate(state, { score, difficulty: state.difficulty }) };
    levels.push(state.difficulty);
  }
  const changes = levels.filter((l, i) => i > 0 && l !== levels[i - 1]).length;
  assert.ok(changes <= 1, `difficulty changed ${changes} times: ${levels.join(',')}`);
});

// ---------------- Interview state machine (spec §11) ----------------
test('state machine: plans follow the spec phase order and drop RESUME without a resume', () => {
  const plan = sm.planFor('Technical Round');
  const order = plan.map(p => p.phase);
  assert.deepEqual(order, ['INTRODUCTION', 'BACKGROUND', 'RESUME', 'TECHNICAL_BASICS', 'TECHNICAL_DEPTH', 'PROBLEM_SOLVING', 'SCENARIO_SYSTEM_THINKING', 'BEHAVIORAL_HR', 'FINAL']);
  assert.ok(!sm.planFor('Technical Round', { hasResume: false }).some(p => p.phase === 'RESUME'));
});

test('state machine: advance moves through phase quotas and finishes in FEEDBACK', () => {
  const plan = [{ phase: 'INTRODUCTION', questions: 1 }, { phase: 'TECHNICAL_BASICS', questions: 2 }, { phase: 'FINAL', questions: 1 }];
  assert.equal(sm.advance(plan, { phaseIndex: 0, questionsAskedInPhase: 1 }).phase, 'TECHNICAL_BASICS');
  assert.equal(sm.advance(plan, { phaseIndex: 1, questionsAskedInPhase: 1 }).phase, 'TECHNICAL_BASICS');
  assert.equal(sm.advance(plan, { phaseIndex: 1, questionsAskedInPhase: 2 }).phase, 'FINAL');
  const end = sm.advance(plan, { phaseIndex: 2, questionsAskedInPhase: 1 });
  assert.equal(end.phase, 'FEEDBACK');
  assert.equal(end.finished, true);
});

test('state machine: counter-question strategy is chosen deterministically from signals', () => {
  const d = (decision, confidence = 0.8) => ({ decision, confidence });
  assert.equal(sm.selectStrategy({ phase: 'TECHNICAL_BASICS', followUpsForQuestion: 0, signals: null }).strategy, 'NEW_QUESTION');
  assert.equal(sm.selectStrategy({ phase: 'TECHNICAL_BASICS', followUpsForQuestion: 0, signals: { response_state: d('NEEDS_CLARIFICATION') } }).strategy, 'CLARIFICATION');
  assert.equal(sm.selectStrategy({ phase: 'TECHNICAL_BASICS', followUpsForQuestion: 0, signals: { unsupported_claim: d('YES') } }).strategy, 'CORRECTION');
  assert.equal(sm.selectStrategy({ phase: 'TECHNICAL_BASICS', followUpsForQuestion: 0, signals: { followup_needed: d('YES') } }).strategy, 'DEPTH');
  assert.equal(sm.selectStrategy({ phase: 'TECHNICAL_BASICS', followUpsForQuestion: 0, signals: { response_state: d('STRONG') } }).strategy, 'CHALLENGE');
  // a confident-looking answer to a different question is off-topic, not strong
  const offTopic = { response_state: d('STRONG', 0.54), relevance: { decision: 'LOW', confidence: 0.4, probabilities: { HIGH: 0.07, MEDIUM: 0.32, LOW: 0.4, NONE: 0.21 } } };
  assert.equal(sm.selectStrategy({ phase: 'TECHNICAL_BASICS', followUpsForQuestion: 0, signals: offTopic }).strategy, 'CLARIFICATION');
  const onTopic = { response_state: d('STRONG', 0.74), relevance: { decision: 'HIGH', confidence: 0.39, probabilities: { HIGH: 0.39, MEDIUM: 0.28, LOW: 0.22, NONE: 0.12 } } };
  assert.equal(sm.selectStrategy({ phase: 'TECHNICAL_BASICS', followUpsForQuestion: 0, signals: onTopic }).strategy, 'CHALLENGE');
  // follow-up limit and non-technical phases
  assert.equal(sm.selectStrategy({ phase: 'TECHNICAL_BASICS', followUpsForQuestion: 1, signals: { followup_needed: d('YES') } }).strategy, 'NEW_QUESTION');
  assert.equal(sm.selectStrategy({ phase: 'BEHAVIORAL_HR', followUpsForQuestion: 0, signals: { followup_needed: d('YES') } }).strategy, 'NEW_QUESTION');
  // low-confidence signals are ignored
  assert.equal(sm.selectStrategy({ phase: 'TECHNICAL_BASICS', followUpsForQuestion: 0, signals: { followup_needed: d('YES', 0.2) } }).strategy, 'NEW_QUESTION');
});

test('state machine: duplicate questions are detected', () => {
  assert.equal(sm.isDistinctQuestion('Explain how a hash table handles collisions', ['How does a hash table handle collisions?']), false);
  assert.equal(sm.isDistinctQuestion('What is a deadlock and how do you prevent it?', ['How does a hash table handle collisions?']), true);
  // Shared question scaffolding ("could you explain how you would design") is not a repeat
  assert.equal(sm.isDistinctQuestion('Could you explain how you would design the database schema for the orders table?', ['Could you explain how you would design a REST API for an online bookstore?']), true);
  assert.equal(sm.isDistinctQuestion('How would you design a REST API for a bookstore online?', ['Could you explain how you would design a REST API for an online bookstore?']), false);
  // A follow-up may reuse the topic words of the question it follows up; only a near-repeat is rejected
  assert.equal(sm.isDistinctQuestion('How would you ensure data consistency in this bookstore schema design?', ['How would you design the schema for an online bookstore?'], { followUp: true }), true);
  assert.equal(sm.isDistinctQuestion('How would you design the schema for an online bookstore system?', ['How would you design the schema for an online bookstore?'], { followUp: true }), false);
});

test('state machine: follow-ups map to the counter-question UI phase', () => {
  assert.equal(sm.uiPhaseIndex('TECHNICAL_BASICS', 'DEPTH'), 3);
  assert.equal(sm.uiPhaseIndex('TECHNICAL_BASICS', 'NEW_QUESTION'), 2);
  assert.equal(sm.uiPhaseIndex('FEEDBACK', 'CLOSING'), 6);
});

// ---------------- Aptitude (spec §12) ----------------
test('aptitude: deterministic matching with numeric tolerance', () => {
  assert.equal(apt.answersMatch('50.0%', '50.0%'), true);
  assert.equal(apt.answersMatch('50%', '50.0%'), true);
  assert.equal(apt.answersMatch(' 7 ', '7'), true);
  assert.equal(apt.answersMatch('7.4 days', '7.5 days'), false);
  assert.equal(apt.answersMatch('7.4 days', '7.5 days', 0.1), true);
  assert.equal(apt.answersMatch('O(N log N)', 'O(n log n)'), true);
  assert.equal(apt.answersMatch(null, '7'), false);
});

test('aptitude: correct answers are spread evenly over option positions', () => {
  const qs = Array.from({ length: 8 }, (_, i) => ({ options: ['right', 'w1', 'w2', 'w3'], correctAnswer: 'right', id: i }));
  const out = apt.balanceOptionPositions(qs);
  const positions = out.map(q => q.options.indexOf('right'));
  assert.deepEqual(positions, [0, 1, 2, 3, 0, 1, 2, 3]);
  assert.deepEqual(qs[1].options, ['right', 'w1', 'w2', 'w3'], 'inputs are not mutated');
  for (const q of out) assert.equal(new Set(q.options).size, 4);
});

test('aptitude: option letters resolve to option text', () => {
  const q = { options: ['10', '20', '30', '40'] };
  assert.equal(apt.resolveChoice(q, 'B'), '20');
  assert.equal(apt.resolveChoice(q, 'E'), null);
});

// ---------------- Resume (spec §13) ----------------
test('resume: extracted items that are not in the source text are dropped', () => {
  const text = 'Skills: Python, React\nProjects\nCountMeDown | JavaScript, HTML\nBuilt a countdown timer.';
  const out = resume.verifyAgainstSource({
    skills: ['Python', 'React', 'Kubernetes'],
    projects: [{ title: 'CountMeDown', description: 'Countdown', stack: ['JavaScript', 'Rust'], outcomes: [] }, { title: 'Invented Project', stack: [] }],
    experience: [{ role: 'Senior Engineer', organization: 'Google', highlights: [] }],
    certifications: ['AWS Certified']
  }, text);
  assert.deepEqual(out.skills, ['Python', 'React']);
  assert.equal(out.projects.length, 1);
  assert.deepEqual(out.projects[0].stack, ['JavaScript']);
  assert.equal(out.experience.length, 0);
  assert.equal(out.certifications.length, 0);
  assert.ok(out.dropped.length >= 3);
});

test('resume: role skills with alternatives match any alternative', () => {
  assert.equal(resume.skillMatches('Java / Python / C++', ['python'], ''), true);
  assert.equal(resume.skillMatches('System Design', ['python'], 'no such words'), false);
});

// ---------------- Benchmark metrics (spec §28) ----------------
test('benchmark: metrics are computed correctly on a synthetic set', () => {
  const items = [
    { id: 1, category: 'correct', expertLabel: 'Pass', expertScore: 80, acceptableRange: [70, 90], predClass: 'CORRECT', predScore: 82, latencyMs: 100 },
    { id: 2, category: 'incorrect', expertLabel: 'Fail', expertScore: 20, acceptableRange: [10, 30], predClass: 'CORRECT', predScore: 70, latencyMs: 200 },
    { id: 3, category: 'partially_correct', expertLabel: 'Moderate', expertScore: 55, acceptableRange: [45, 65], predClass: 'PARTIALLY_CORRECT', predScore: 50, latencyMs: 300 }
  ];
  const { metrics } = bench.computeMetrics(items);
  assert.equal(metrics.accuracy3, 0.667);
  assert.equal(metrics.falsePositiveRate, 1);
  assert.equal(metrics.falseNegativeRate, 0);
  assert.equal(metrics.mae, Number(((2 + 50 + 5) / 3).toFixed(2)));
  assert.equal(metrics.inRangeRate, 0.667);
  assert.equal(metrics.latencyP50Ms, 200);
  assert.equal(bench.pearson([1, 2, 3], [2, 4, 6]), 1);
});

// ---------------- Utilities & security helpers ----------------
test('vectors: cosine similarity behaves at the extremes', () => {
  assert.ok(Math.abs(cosineSimilarity([1, 2, 3], [1, 2, 3]) - 1) < 1e-9);
  assert.equal(cosineSimilarity([1, 0], [0, 1]), 0);
  assert.equal(cosineSimilarity([], [1]), 0);
});

test('rate limiter: token bucket allows bursts up to capacity and denies overflow', () => {
  const bucket = new TokenBucket(3, 0.0001);
  assert.equal(bucket.tryConsume(), true);
  assert.equal(bucket.tryConsume(), true);
  assert.equal(bucket.tryConsume(), true);
  assert.equal(bucket.tryConsume(), false);
});

test('security: scrubPII removes emails and phone numbers before prompting', () => {
  const out = scrubPII('Reach me at alex@college.edu or +91 98765 43210');
  assert.ok(!out.includes('alex@college.edu'));
  assert.ok(!/98765/.test(out));
});

test('providers: reasoning blocks are stripped from model output', () => {
  assert.equal(stripReasoning('<think>secret chain</think>\nFinal answer'), 'Final answer');
});

test('json: model JSON is extracted from fenced or wrapped text', () => {
  assert.deepEqual(parseModelJson('```json\n{"a":1}\n```'), { a: 1 });
  assert.equal(parseModelJson('no json here'), null);
});

test('interviewer: leaked transcript markup never reaches the student', () => {
  const { cleanUtterance } = require('../../services/interviewService');
  // Observed: fake candidate turn, then the real question after "Interviewer:"
  assert.equal(
    cleanUtterance("<candidate_answer> Understood, let's focus on OS. </candidate_answer> Interviewer: Great, what is a deadlock?"),
    'Great, what is a deadlock?'
  );
  // Observed: stray opening tag with no closing tag
  assert.equal(
    cleanUtterance("<candidate_answer> That's great! Can you explain the time complexity of merge sort?"),
    "That's great! Can you explain the time complexity of merge sort?"
  );
  assert.equal(cleanUtterance('"Interviewer: What is a hash map?"'), 'What is a hash map?');
  assert.equal(cleanUtterance('<candidate_answer>only fake text</candidate_answer>'), '');
  assert.equal(cleanUtterance('Plain question about indexes?'), 'Plain question about indexes?');
});

test('interviewer: code like List<String> is a valid question; only leaked prompt tags are rejected', () => {
  const { isWellFormedUtterance } = require('../../services/interviewService');
  assert.equal(isWellFormedUtterance('Good. How would you iterate over a List<String> in Java safely?'), true);
  assert.equal(isWellFormedUtterance('What is the difference between Map<K, V> and Set<E> in Java?'), true);
  assert.equal(isWellFormedUtterance('Fine. <candidate_answer> fake </candidate_answer> What next?'), false);
  assert.equal(isWellFormedUtterance('Candidate: I think so. Now explain hashing?'), false);
  assert.equal(isWellFormedUtterance('Too short'), false);
});

test('interviewer: an unusable model reply falls back to a distinct topic question', () => {
  const { fallbackUtterance } = require('../../services/interviewService');
  const q = fallbackUtterance({ strategy: 'NEW_QUESTION', phase: 'Technical Basics', topic: 'Database Systems & SQL', previousQuestions: [] });
  assert.match(q, /Database Systems & SQL/);
  const next = fallbackUtterance({ strategy: 'NEW_QUESTION', phase: 'Technical Basics', topic: 'Database Systems & SQL', previousQuestions: [q] });
  assert.notEqual(next, q, 'never repeats the previous question');
  assert.match(fallbackUtterance({ strategy: 'CLOSING', phase: 'Final', topic: 'General' }), /concludes the interview/);
});

test('report: improvement analysis computes the gap, point gains and progress from real data', () => {
  const { buildImprovementAnalysis } = require('../../services/reportService');
  const dims = [
    { name: 'Correctness', key: 'correctness', score: 50 },
    { name: 'Relevance', key: 'relevance', score: 80 },
    { name: 'Technical Depth', key: 'technicalDepth', score: 40 },
    { name: 'Completeness', key: 'completeness', score: 60 },
    { name: 'Reasoning', key: 'reasoning', score: 70 },
    { name: 'Clarity', key: 'clarity', score: 90 },
    { name: 'Communication', key: 'communication', score: 65 }
  ];
  const rows = [{ topic: 'SQL', missingConcepts: ['JOIN', 'Indexes'] }, { topic: 'SQL', missingConcepts: ['JOIN'] }];
  const history = { sessions: [{ score: 48, at: new Date('2026-10-01') }, { score: 40, at: new Date('2026-09-20') }], recurring: [{ concept: 'JOIN', times: 2 }], topics: [{ topic: 'SQL', average: 45 }], missedConcepts: ['JOIN'] };
  const a = buildImprovementAnalysis({ overall: 58, dimensions: dims, weakTopics: [{ topic: 'SQL', score: 55, priority: 'Medium', missingConcepts: ['JOIN'] }], rows, history });
  assert.equal(a.gap, 12);
  // Correctness: 0.25 × (70 − 50) = 5 points — the biggest single gain
  assert.deepEqual(a.dimensionGaps[0], { name: 'Correctness', key: 'correctness', score: 50, target: 70, gap: 20, weightPercentage: 25, pointsGain: 5 });
  assert.ok(!a.dimensionGaps.some(d => d.key === 'relevance'), 'dimensions above target need no work');
  assert.ok(a.fastestPath.length >= 1 && a.fastestPath[0] === 'Correctness');
  assert.equal(a.history.previousScore, 48);
  assert.equal(a.history.change, 10);
  assert.equal(a.history.previousAverage, 44);
  assert.equal(a.conceptsToLearn[0].concept, 'JOIN');
  assert.equal(a.conceptsToLearn[0].missedBefore, true);
  assert.equal(a.topicsToImprove[0].earlierAverage, 45);
  const first = buildImprovementAnalysis({ overall: 75, dimensions: dims, weakTopics: [], rows: [], history: null });
  assert.equal(first.readyNow, true);
  assert.equal(first.history.change, null);
});

test('memory: the interviewer prompt block is empty without history and never fails the turn', async t => {
  const mem = require('../../services/interviewMemory');
  const InterviewMemory = require('../../models/InterviewMemory');
  t.mock.method(InterviewMemory, 'find', () => ({ select: () => ({ sort: () => ({ limit: () => ({ lean: async () => [] }) }) }) }));
  assert.equal(await mem.promptBlock('000000000000000000000001', { query: 'SQL joins' }), '');
  t.mock.method(InterviewMemory, 'find', () => { throw new Error('db down'); });
  assert.equal(await mem.promptBlock('000000000000000000000002', { query: 'SQL joins' }), '');
});

test('jobs: grading with a separate model waits for the live interview to end', t => {
  const config = require('../../config/env');
  const { shouldDeferForLiveSession } = require('../../services/interviewService');
  const { deferJob } = require('../../services/jobQueue');
  t.after(() => Object.assign(config.ai, saved));
  const saved = { model: config.ai.model, evaluationModel: config.ai.evaluationModel };
  const live = { status: 'in_progress', endedAt: null, updatedAt: new Date() };

  Object.assign(config.ai, { model: 'dialogue', evaluationModel: 'grader' });
  assert.equal(shouldDeferForLiveSession(live), true);
  assert.equal(shouldDeferForLiveSession({ ...live, endedAt: new Date() }), false);
  assert.equal(shouldDeferForLiveSession({ ...live, updatedAt: new Date(Date.now() - 21 * 60 * 1000) }), false, 'abandoned sessions are graded');
  Object.assign(config.ai, { model: 'same', evaluationModel: 'same' });
  assert.equal(shouldDeferForLiveSession(live), false, 'one shared model never needs a swap');

  const err = deferJob(5000);
  assert.equal(err.code, 'JOB_DEFERRED');
  assert.equal(err.delayMs, 5000);
});

test('speech signals: filler words and communication stats are observable counts', () => {
  assert.equal(countFillers('Um, I basically think, like, it is fine'), 3);
  const stats = communicationStats([
    { question: 'Q one two', answer: 'um answer here', speech: { wordCount: 3, fillerWordCount: 1, responseLatencyMs: 2000, inputMode: 'voice', speakingDurationMs: 6000 } }
  ], { createdAt: new Date(Date.now() - 60000), endedAt: new Date() });
  assert.equal(stats.fillerWordCount, 1);
  assert.equal(stats.averageResponseTimeSeconds, 2);
  assert.equal(stats.paceWordsPerMinute, 30);
});

test('interviewer: replies that repeat the candidate in their own voice are rejected, quoting is allowed', () => {
  const answer = "Hi, I'm a final-year CSE student. I built a REST API in Node.js with Express and MongoDB and added an index on the email field to keep lookups fast.";
  assert.equal(sm.echoesAnswer("Hi, I'm a final-year CSE student. I built a REST API in Node.js with Express and MongoDB?", answer), true);
  assert.equal(sm.echoesAnswer('I built a REST API in Node.js with Express and MongoDB. What would you like to know?', answer), true);
  assert.equal(sm.echoesAnswer('Great! You built a REST API using Node.js, Express, and MongoDB. Why did you add an index on the email field?', answer), false);
  assert.equal(sm.echoesAnswer('You mentioned you added an index on the email field to keep lookups fast. How does that index work?', answer), false);
  assert.equal(sm.echoesAnswer('Could you explain how a hash map handles collisions?', ''), false);
});
