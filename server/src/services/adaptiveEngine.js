/**
 * Topic mastery and adaptive difficulty (spec §10).
 *
 *   recentPerformance = recency-weighted average of the last N topic results
 *   smoothed          = α·recentPerformance + (1-α)·previousMastery
 *   mastery           = clamp(smoothed + difficultyAdj + consistencyAdj + coverageAdj, 0, 100)
 *
 * Difficulty transitions are deterministic and reproducible:
 *   mastery ≥ 80 and recent ≥ 75 (with ≥ MIN_ATTEMPTS_BEFORE_CHANGE at the current level) → harder
 *   mastery < 40 or ≥ 2 consecutive failures                                             → easier
 *   otherwise                                                                            → unchanged
 * Laya's increase_difficulty decision is stored with each result as a signal only.
 */
const TopicMastery = require('../models/TopicMastery');

const RECENT_WINDOW = 5;
const ALPHA = 0.4;
const FAILURE_THRESHOLD = 50;
const MIN_ATTEMPTS_BEFORE_CHANGE = 2;
const LEVELS = ['Easy', 'Medium', 'Hard'];

const INTERVIEW_TOPICS = [
  'Data Structures & Algorithms',
  'Database Systems & SQL',
  'Operating Systems & Networking',
  'Object-Oriented Programming',
  'System Design & Scalability',
  'Concurrency & Multithreading',
  'Projects & Resume',
  'Behavioral & Communication'
];

const BANDS = [
  { max: 30, band: 'Beginner', difficulty: 'Easy', action: 'Remedial explanation + Easy' },
  { max: 50, band: 'Developing', difficulty: 'Easy', action: 'Easy / lower-Medium' },
  { max: 70, band: 'Intermediate', difficulty: 'Medium', action: 'Medium' },
  { max: 85, band: 'Strong', difficulty: 'Medium', action: 'Medium / Hard' },
  { max: 100, band: 'Advanced', difficulty: 'Hard', action: 'Hard / challenge' }
];

function bandFor(mastery) {
  return BANDS.find(b => mastery <= b.max) || BANDS[BANDS.length - 1];
}

function clamp(v, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, v));
}

/** Recency-weighted average: weights 1..n, newest highest. */
function recencyWeightedAverage(scores) {
  if (!scores.length) return null;
  let num = 0;
  let den = 0;
  scores.forEach((s, i) => {
    num += s * (i + 1);
    den += i + 1;
  });
  return num / den;
}

function stdev(values) {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length);
}

/**
 * Pure mastery update — given the previous state and a new result, returns the next state.
 * @param {{masteryScore:number, attemptsCount:number, recentResults:Array, difficulty:string,
 *          attemptsAtDifficulty:number, consecutiveFailures:number}} prev
 * @param {{score:number, difficulty:string, conceptCoverage?:number|null}} result
 */
function computeMasteryUpdate(prev, result) {
  const score = clamp(Number(result.score) || 0);
  const recentResults = [...(prev.recentResults || []), {
    score,
    difficulty: result.difficulty || prev.difficulty || 'Medium',
    conceptCoverage: typeof result.conceptCoverage === 'number' ? result.conceptCoverage : null,
    layaIncreaseDifficulty: result.layaIncreaseDifficulty || null,
    at: result.at || new Date()
  }].slice(-RECENT_WINDOW);
  const scores = recentResults.map(r => r.score);

  const recentPerformance = recencyWeightedAverage(scores);
  const previousMastery = prev.attemptsCount > 0 ? prev.masteryScore : recentPerformance;
  const smoothed = ALPHA * recentPerformance + (1 - ALPHA) * previousMastery;

  const difficulty = result.difficulty || prev.difficulty || 'Medium';
  let difficultyAdjustment = 0;
  if (difficulty === 'Hard' && score >= 60) difficultyAdjustment = 3;
  else if (difficulty === 'Easy' && score < FAILURE_THRESHOLD) difficultyAdjustment = -3;

  let consistencyAdjustment = 0;
  if (scores.length >= 3) {
    const sd = stdev(scores);
    if (sd < 10) consistencyAdjustment = 2;
    else if (sd > 25) consistencyAdjustment = -2;
  }

  const coverageAdjustment = typeof result.conceptCoverage === 'number' ? (result.conceptCoverage - 0.5) * 6 : 0;
  const mastery = Math.round(clamp(smoothed + difficultyAdjustment + consistencyAdjustment + coverageAdjustment));

  const consecutiveFailures = score < FAILURE_THRESHOLD ? (prev.consecutiveFailures || 0) + 1 : 0;
  const attemptsAtDifficulty = (prev.attemptsAtDifficulty || 0) + 1;
  const transition = nextDifficulty({
    current: prev.difficulty || 'Medium',
    mastery,
    recentScore: score,
    consecutiveFailures,
    attemptsAtDifficulty
  });

  return {
    masteryScore: mastery,
    band: bandFor(mastery).band,
    difficulty: transition.difficulty,
    transition,
    attemptsCount: (prev.attemptsCount || 0) + 1,
    attemptsAtDifficulty: transition.changed ? 0 : attemptsAtDifficulty,
    consecutiveFailures: transition.changed && transition.rule === 'decrease' ? 0 : consecutiveFailures,
    recentResults,
    components: { recentPerformance, previousMastery, smoothed, difficultyAdjustment, consistencyAdjustment, coverageAdjustment }
  };
}

/** Deterministic difficulty transition (spec §10.3). */
function nextDifficulty({ current, mastery, recentScore, consecutiveFailures, attemptsAtDifficulty }) {
  const idx = Math.max(0, LEVELS.indexOf(current));
  if (mastery >= 80 && recentScore >= 75 && attemptsAtDifficulty >= MIN_ATTEMPTS_BEFORE_CHANGE && idx < LEVELS.length - 1) {
    return { difficulty: LEVELS[idx + 1], changed: true, rule: 'increase' };
  }
  if ((mastery < 40 || consecutiveFailures >= 2) && idx > 0) {
    return { difficulty: LEVELS[idx - 1], changed: true, rule: 'decrease' };
  }
  return { difficulty: LEVELS[idx], changed: false, rule: 'hold' };
}

/** Persists a new result for a topic and returns the updated record plus the change. */
async function recordTopicResult(userId, topic, { score, difficulty, conceptCoverage = null, source = 'interview', strengths = [], weaknesses = [], layaIncreaseDifficulty = null }) {
  if (!userId || !topic || typeof score !== 'number') return null;
  let record = await TopicMastery.findOne({ userId, topic, source });
  if (!record) {
    record = new TopicMastery({ userId, topic, source, difficulty: difficulty || bandFor(score).difficulty });
  }
  const before = { mastery: record.attemptsCount ? record.masteryScore : null, difficulty: record.difficulty, band: record.attemptsCount ? record.band : null };
  const next = computeMasteryUpdate(record.toObject(), { score, difficulty: difficulty || record.difficulty, conceptCoverage, layaIncreaseDifficulty });

  record.masteryScore = next.masteryScore;
  record.band = next.band;
  record.difficulty = next.difficulty;
  record.attemptsCount = next.attemptsCount;
  record.attemptsAtDifficulty = next.attemptsAtDifficulty;
  record.consecutiveFailures = next.consecutiveFailures;
  record.recentResults = next.recentResults;
  if (next.transition.changed) {
    record.transitions = [...record.transitions, { from: before.difficulty, to: next.difficulty, rule: next.transition.rule, mastery: next.masteryScore, at: new Date() }].slice(-20);
  }
  if (strengths.length) record.strengths = Array.from(new Set([...record.strengths, ...strengths])).slice(-5);
  if (weaknesses.length) record.weaknesses = Array.from(new Set([...record.weaknesses, ...weaknesses])).slice(-5);
  record.lastAssessedAt = new Date();
  await record.save();

  return {
    topic,
    source,
    before,
    after: { mastery: record.masteryScore, difficulty: record.difficulty, band: record.band },
    transition: next.transition
  };
}

/** Topics the student has practised, weakest first. Unpractised topics are not given a score. */
async function getStudentAdaptiveProfile(userId, source = 'interview') {
  const records = await TopicMastery.find({ userId, source }).sort({ masteryScore: 1 });
  const practised = records.map(r => ({
    topic: r.topic,
    masteryScore: r.masteryScore,
    band: r.band,
    difficulty: r.difficulty,
    attemptsCount: r.attemptsCount,
    strengths: r.strengths,
    weaknesses: r.weaknesses,
    lastAssessedAt: r.lastAssessedAt
  }));
  const practisedNames = new Set(practised.map(p => p.topic));
  return {
    topics: practised,
    unpractised: source === 'interview' ? INTERVIEW_TOPICS.filter(t => !practisedNames.has(t)) : [],
    weakest: practised[0] || null
  };
}

/** Difficulty to use for a topic: stored per-topic level, or Medium when the topic is new. */
async function getTopicDifficulty(userId, topic, source = 'interview') {
  const r = await TopicMastery.findOne({ userId, topic, source });
  return r ? r.difficulty : 'Medium';
}

module.exports = {
  INTERVIEW_TOPICS,
  BANDS,
  LEVELS,
  bandFor,
  recencyWeightedAverage,
  computeMasteryUpdate,
  nextDifficulty,
  recordTopicResult,
  getStudentAdaptiveProfile,
  getTopicDifficulty
};
