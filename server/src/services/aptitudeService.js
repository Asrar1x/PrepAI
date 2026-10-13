/**
 * Aptitude engine (spec §12, §33 APTITUDE ENGINE).
 *  - Deterministic correctness (option match, numeric tolerance) — the LLM never decides it.
 *  - Server-side timing: each answer is timestamped on arrival; answers after the deadline
 *    (plus a small network grace) do not count.
 *  - Per-category mastery drives which difficulty is served next (adaptive selection).
 *  - Explanations: stored explanations are used; when a question has none, the generative model
 *    writes one in the background, given the already-decided correct option.
 */
const QuestionBank = require('../models/QuestionBank');
const AptitudeAttempt = require('../models/AptitudeAttempt');
const TopicMastery = require('../models/TopicMastery');
const { recordTopicResult } = require('./adaptiveEngine');
const { providerFactory } = require('./providers/AIProviderFactory');
const { renderPrompt } = require('../prompts');
const { parseModelJson } = require('./jsonOutput');
const jobQueue = require('./jobQueue');

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];
const DEADLINE_GRACE_MS = 15000;
const LEVEL_TO_BANK = { Easy: 'easy', Medium: 'medium', Hard: 'hard' };

function parseNumeric(value) {
  const m = String(value || '').replace(/,/g, '').match(/^\s*[-+]?\$?\s*(\d+(\.\d+)?)\s*(%|days?|seconds?|km\/h|m\/s|units?)?\s*$/i);
  return m ? Number(m[1]) : null;
}

/**
 * Deterministic answer check. Exact (case/space-insensitive) text match, or — for numeric
 * answers — equality within the question's tolerance (default: exact to 1e-9).
 */
function answersMatch(chosen, correct, tolerance = null) {
  if (chosen === null || chosen === undefined || correct === null || correct === undefined) return false;
  const norm = s => String(s).trim().toLowerCase().replace(/\s+/g, ' ');
  if (norm(chosen) === norm(correct)) return true;
  const a = parseNumeric(chosen);
  const b = parseNumeric(correct);
  if (a === null || b === null) return false;
  const tol = typeof tolerance === 'number' && tolerance >= 0 ? tolerance : 1e-9;
  return Math.abs(a - b) <= tol;
}

/**
 * Spreads correct answers evenly over A–D so a fixed-letter guess cannot score: the i-th question's
 * correct option is swapped into position i % optionCount. Answers are matched by text, so this is safe.
 * @returns {Array} new question objects (inputs are not mutated)
 */
function balanceOptionPositions(questions) {
  return questions.map((q, i) => {
    const options = [...(q.options || [])];
    const from = options.findIndex(o => answersMatch(o, q.correctAnswer));
    if (from < 0 || options.length < 2) return q;
    const to = i % options.length;
    [options[from], options[to]] = [options[to], options[from]];
    return { ...q, options };
  });
}

function resolveChoice(question, optionLetter) {
  const idx = OPTION_LETTERS.indexOf(optionLetter);
  return idx >= 0 && question.options[idx] !== undefined ? question.options[idx] : null;
}

/** Difficulty to serve per category for this user, from aptitude mastery (default Medium). */
async function categoryDifficulties(userId) {
  const records = await TopicMastery.find({ userId, source: 'aptitude' });
  return new Map(records.map(r => [r.topic, r.difficulty]));
}

/**
 * Adaptive selection: spreads questions across available categories (company-tagged first) and,
 * within each category, prefers the user's current difficulty level for that category.
 */
async function pickAdaptiveQuestions({ userId, companyPattern, count }) {
  const pattern = String(companyPattern || '').toLowerCase();
  const baseMatch = { isActive: { $ne: false } };
  const tagged = pattern && pattern !== 'standard' ? { ...baseMatch, companyTags: pattern } : baseMatch;
  let categories = await QuestionBank.distinct('category', tagged);
  if (!categories.length) categories = await QuestionBank.distinct('category', baseMatch);
  if (!categories.length) return [];

  const levels = await categoryDifficulties(userId);
  const picked = [];
  const used = new Set();
  // Round-robin over categories so every test covers the pattern's sections
  for (let round = 0; picked.length < count && round < count; round++) {
    let progressed = false;
    for (const category of categories) {
      if (picked.length >= count) break;
      const level = LEVEL_TO_BANK[levels.get(category) || 'Medium'];
      const exclude = Array.from(used);
      const tiers = [
        { ...tagged, category, difficulty: level },
        { ...baseMatch, category, difficulty: level },
        { ...tagged, category },
        { ...baseMatch, category }
      ];
      for (const match of tiers) {
        const [q] = await QuestionBank.aggregate([{ $match: { ...match, _id: { $nin: exclude } } }, { $sample: { size: 1 } }]);
        if (q) {
          picked.push(q);
          used.add(q._id);
          progressed = true;
          break;
        }
      }
    }
    if (!progressed) break;
  }
  return picked;
}

function deadlineOf(session) {
  return new Date(new Date(session.createdAt).getTime() + (session.durationMinutes || 15) * 60000);
}

/** Records one answer with server-side timing (spec: timing by server timestamps). */
async function recordAttempt(session, question, optionLetter) {
  const now = new Date();
  const servedIds = (session.questionsData || []).map(q => String(q.questionId));
  if (!servedIds.includes(String(question._id))) {
    const err = new Error('Question is not part of this session');
    err.status = 400;
    throw err;
  }
  const previous = await AptitudeAttempt.findOne({ sessionId: session._id }).sort({ answeredAt: -1 });
  const since = previous ? previous.answeredAt : session.createdAt;
  const chosenText = resolveChoice(question, optionLetter);
  const afterDeadline = now.getTime() > deadlineOf(session).getTime() + DEADLINE_GRACE_MS;
  return AptitudeAttempt.findOneAndUpdate(
    { sessionId: session._id, questionId: question._id },
    {
      sessionId: session._id,
      userId: session.userId,
      questionId: question._id,
      questionVersion: question.version || 1,
      category: question.category,
      difficulty: question.difficulty,
      selectedOption: optionLetter,
      selectedAnswer: chosenText,
      correct: answersMatch(chosenText, question.correctAnswer, question.numericTolerance),
      durationMs: Math.max(0, now - new Date(since)),
      answeredAt: now,
      afterDeadline
    },
    { upsert: true, new: true }
  );
}

/**
 * Scores a session. Answers come from timed attempts; letters in the final submission are
 * recorded as attempts first (so they get server timestamps too). Answers after the deadline
 * are not counted.
 */
async function scoreSession(session, questions, submittedAnswers = {}) {
  const byId = new Map(questions.map(q => [q._id.toString(), q]));
  for (const [qid, letter] of Object.entries(submittedAnswers || {})) {
    const q = byId.get(String(qid));
    if (!q || !OPTION_LETTERS.includes(letter)) continue;
    const existing = await AptitudeAttempt.findOne({ sessionId: session._id, questionId: q._id });
    if (!existing || existing.selectedOption !== letter) await recordAttempt(session, q, letter);
  }
  const attempts = await AptitudeAttempt.find({ sessionId: session._id });
  const attemptById = new Map(attempts.map(a => [String(a.questionId), a]));

  let correct = 0;
  let wrong = 0;
  let skipped = 0;
  let late = 0;
  const weak = new Set();
  const perCategory = new Map();

  const questionsData = (session.questionsData || []).map(entry => {
    const q = byId.get(String(entry.questionId));
    const attempt = attemptById.get(String(entry.questionId));
    const counted = attempt && !attempt.afterDeadline && attempt.selectedAnswer;
    if (attempt && attempt.afterDeadline) late += 1;
    const cat = entry.category || (q && q.category) || 'General';
    const c = perCategory.get(cat) || { total: 0, correct: 0, difficulties: [] };
    c.total += 1;
    if (q) c.difficulties.push(q.difficulty);
    if (!counted) {
      skipped += 1;
      perCategory.set(cat, c);
      return { ...entry, selectedLetter: null, selectedAnswer: null, isCorrect: false, skipped: true, durationMs: attempt ? attempt.durationMs : null };
    }
    if (attempt.correct) {
      correct += 1;
      c.correct += 1;
    } else {
      wrong += 1;
      if (entry.subCategory) weak.add(entry.subCategory);
    }
    perCategory.set(cat, c);
    return { ...entry, selectedLetter: attempt.selectedOption, selectedAnswer: attempt.selectedAnswer, isCorrect: attempt.correct, skipped: false, durationMs: attempt.durationMs, questionVersion: attempt.questionVersion };
  });

  return { questionsData, correct, wrong, skipped, late, weakTopics: Array.from(weak), perCategory };
}

const DIFFICULTY_RANK = { easy: 0, medium: 1, hard: 2 };
const RANK_TO_LEVEL = ['Easy', 'Medium', 'Hard'];

/** Updates per-category aptitude mastery from a scored session. */
async function updateAptitudeMastery(userId, perCategory) {
  const changes = [];
  for (const [category, c] of perCategory.entries()) {
    if (!c.total) continue;
    const ranks = c.difficulties.map(d => DIFFICULTY_RANK[String(d).toLowerCase()] ?? 1);
    const avgRank = Math.round(ranks.reduce((a, b) => a + b, 0) / Math.max(1, ranks.length));
    changes.push(await recordTopicResult(userId, category, {
      score: Math.round((c.correct / c.total) * 100),
      difficulty: RANK_TO_LEVEL[avgRank],
      source: 'aptitude'
    }));
  }
  return changes;
}

/** Background job: write explanations for questions that have none. */
async function explainQuestionJob({ questionId }) {
  const q = await QuestionBank.findById(questionId);
  if (!q || (q.explanation && q.explanation.trim()) || (q.generatedExplanation && q.generatedExplanation.steps && q.generatedExplanation.steps.length)) return;
  const prompt = renderPrompt('aptitude_explainer');
  let parsed = null;
  const result = await providerFactory.execute('aptitude_explanation', p => p.generate({
    system: prompt.text,
    prompt: `Question: ${q.questionText}\nOptions: ${q.options.map((o, i) => `${OPTION_LETTERS[i]}. ${o}`).join(' | ')}\nCorrect option (decided): ${q.correctAnswer}`,
    temperature: 0.2,
    maxTokens: 400,
    json: true
  }), {
    maxRetries: 1,
    validate: res => {
      parsed = parseModelJson(res.text);
      return Boolean(parsed && Array.isArray(parsed.steps) && parsed.steps.length);
    }
  });
  q.generatedExplanation = {
    steps: parsed.steps.filter(s => typeof s === 'string').slice(0, 5),
    shortcut: typeof parsed.shortcut === 'string' ? parsed.shortcut : '',
    model: result.model,
    promptVersion: prompt.version
  };
  await q.save();
}

async function enqueueMissingExplanations(questions) {
  for (const q of questions) {
    if (!(q.explanation && q.explanation.trim())) {
      await jobQueue.enqueue('aptitude.explain', { questionId: String(q._id) }, { priority: 6, dedupeKey: `explain:${q._id}` });
    }
  }
}

function registerJobHandlers() {
  jobQueue.registerHandler('aptitude.explain', explainQuestionJob);
}

module.exports = {
  OPTION_LETTERS,
  answersMatch,
  balanceOptionPositions,
  parseNumeric,
  resolveChoice,
  pickAdaptiveQuestions,
  recordAttempt,
  scoreSession,
  updateAptitudeMastery,
  enqueueMissingExplanations,
  registerJobHandlers,
  deadlineOf
};
