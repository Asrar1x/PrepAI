const express = require('express');
const mongoose = require('mongoose');
const { protect } = require('../middleware/auth');
const QuestionBank = require('../models/QuestionBank');
const AptitudeSession = require('../models/AptitudeSession');
const { recordPractice } = require('../services/gamification');
const aptitudeService = require('../services/aptitudeService');

const router = express.Router();

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];
const STAFF_ROLES = ['admin', 'placement_officer', 'recruiter'];
const QUESTIONS_PER_MINUTE = 0.2; // one question per ~5 minutes of exam time
const DAILY_QUEST_QUESTIONS = 5;
const DAILY_QUEST_XP = 25;
const SESSION_XP = 100;

// Shape sent to the test UI. The answer key and explanation are deliberately omitted so
// they cannot be read from the network response while the test is running.
function toClientQuestion(q) {
  return {
    id: q._id.toString(),
    category: q.category || 'Quantitative Aptitude',
    subCategory: q.subCategory || 'General',
    difficulty: q.difficulty || 'medium',
    questionText: q.questionText,
    options: (q.options || []).map((opt, oIdx) => ({
      id: OPTION_LETTERS[oIdx] || String(oIdx),
      text: opt
    }))
  };
}

function sessionPayload(session, questions) {
  const elapsedSeconds = Math.round((Date.now() - new Date(session.createdAt).getTime()) / 1000);
  const totalSeconds = (session.durationMinutes || 15) * 60;
  const clientQuestions = questions.map(toClientQuestion);
  return {
    id: session._id.toString(),
    session_id: session._id.toString(),
    sessionId: session._id.toString(),
    jobRole: session.jobRole,
    companyPattern: session.companyPattern,
    mode: session.mode,
    durationMinutes: session.durationMinutes,
    duration_minutes: session.durationMinutes,
    totalQuestions: clientQuestions.length,
    currentQuestionIndex: 0,
    timeRemainingSeconds: session.status === 'completed' ? 0 : Math.max(0, totalSeconds - elapsedSeconds),
    status: session.status,
    questions: clientQuestions,
    userAnswers: {}
  };
}

async function findOwnedSession(sessionId, user) {
  if (!mongoose.isValidObjectId(sessionId)) return null;
  const session = await AptitudeSession.findById(sessionId);
  if (!session) return null;
  const isOwner = session.userId && session.userId.toString() === user._id.toString();
  return (isOwner || STAFF_ROLES.includes(user.role)) ? session : null;
}

// Atomically marks a session completed. Only the first of two concurrent submits wins,
// so scoring, mastery updates and XP happen exactly once (double-click / retried request).
async function claimCompletion(session) {
  const res = await AptitudeSession.updateOne(
    { _id: session._id, status: { $ne: 'completed' } },
    { $set: { status: 'completed', completedAt: new Date() } }
  );
  return res.modifiedCount === 1;
}

// Loads a session's questions in the order they were served.
async function loadSessionQuestions(session) {
  const ids = (session.questionsData || []).map(q => q.questionId).filter(Boolean);
  if (ids.length === 0) return [];
  const docs = await QuestionBank.find({ _id: { $in: ids } });
  const byId = new Map(docs.map(d => [d._id.toString(), d]));
  return ids.map(id => byId.get(id.toString())).filter(Boolean);
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// POST /start
router.post(['/start', '/sessions'], protect, async (req, res) => {
  try {
    const { role_slug, job_role, company_slug, company_pattern, mode, duration_minutes, durationMinutes, jobRole, companyPattern } = req.body;
    const sessionMode = mode === 'daily' ? 'daily' : (mode || 'adaptive');
    const minutes = Math.min(180, Math.max(5, Number(durationMinutes || duration_minutes) || 15));
    const pattern = companyPattern || company_pattern || company_slug || 'tcs';
    const questionCount = sessionMode === 'daily'
      ? DAILY_QUEST_QUESTIONS
      : Math.min(30, Math.max(6, Math.round(minutes * QUESTIONS_PER_MINUTE)));

    const bankQuestions = await aptitudeService.pickAdaptiveQuestions({ userId: req.user._id, companyPattern: pattern, count: questionCount });
    if (bankQuestions.length === 0) {
      return res.status(503).json({ detail: 'The question bank is empty. Ask an admin to upload questions.' });
    }

    const session = await AptitudeSession.create({
      userId: req.user._id,
      jobRole: jobRole || job_role || role_slug || 'Software Developer (SDE)',
      companyPattern: pattern,
      mode: sessionMode,
      durationMinutes: minutes,
      status: 'in_progress',
      questionsData: bankQuestions.map(q => ({
        questionId: q._id,
        questionVersion: q.version || 1,
        category: q.category,
        subCategory: q.subCategory,
        difficulty: q.difficulty
      }))
    });

    res.status(201).json(sessionPayload(session, bankQuestions));
  } catch (err) {
    console.error('Aptitude start error:', err);
    res.status(500).json({ detail: 'Failed to start aptitude session' });
  }
});

// GET /stats  (static paths are declared before /:sessionId)
router.get('/stats', protect, async (req, res) => {
  try {
    const sessions = await AptitudeSession.find({ userId: req.user._id, status: 'completed' });
    const total = sessions.length;
    const avg = total > 0 ? Math.round(sessions.reduce((a, c) => a + (c.score || 0), 0) / total) : 0;

    const perCategory = {};
    sessions.forEach(s => (s.questionsData || []).forEach(q => {
      if (typeof q.isCorrect !== 'boolean') return;
      const c = q.category || 'General';
      perCategory[c] = perCategory[c] || { correct: 0, total: 0 };
      perCategory[c].total += 1;
      if (q.isCorrect) perCategory[c].correct += 1;
    }));
    const ranked = Object.entries(perCategory)
      .map(([category, v]) => ({ category, pct: v.correct / v.total }))
      .sort((a, b) => b.pct - a.pct);

    res.json({
      tests_completed: total,
      average_score: avg,
      strongest_area: ranked.length ? ranked[0].category : null,
      weakest_area: ranked.length ? ranked[ranked.length - 1].category : null
    });
  } catch (err) {
    console.error('Aptitude stats error:', err);
    res.status(500).json({ detail: 'Failed to load aptitude stats' });
  }
});

// GET /history
router.get('/history', protect, async (req, res) => {
  try {
    const sessions = await AptitudeSession.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(sessions.map(s => s.toJSON()));
  } catch (err) {
    console.error('Aptitude history error:', err);
    res.status(500).json({ detail: 'Failed to load aptitude history' });
  }
});

// GET /daily — today's quest progress, computed from the user's daily-mode sessions
router.get('/daily', protect, async (req, res) => {
  try {
    const todays = await AptitudeSession.find({
      userId: req.user._id,
      mode: 'daily',
      createdAt: { $gte: startOfToday() }
    }).sort({ createdAt: -1 });
    const completed = todays.find(s => s.status === 'completed');
    const latest = completed || todays[0];
    const answered = latest
      ? (latest.questionsData || []).filter(q => typeof q.isCorrect === 'boolean').length
      : 0;

    const endOfDay = startOfToday();
    endOfDay.setDate(endOfDay.getDate() + 1);

    res.json({
      status: 'success',
      drill_title: '15-Minute Daily Placement Drill',
      questions_count: DAILY_QUEST_QUESTIONS,
      completed_questions: completed ? DAILY_QUEST_QUESTIONS : answered,
      is_completed: Boolean(completed),
      xp_reward: DAILY_QUEST_XP,
      streak: req.user.currentStreak || 0,
      expires_in_hours: Math.max(0, Math.ceil((endOfDay - Date.now()) / 3600000)),
      session_id: latest ? latest._id.toString() : null,
      score: completed ? completed.score : null
    });
  } catch (err) {
    console.error('Aptitude daily error:', err);
    res.status(500).json({ detail: 'Failed to load daily quest' });
  }
});

// GET /:sessionId
router.get('/:sessionId', protect, async (req, res) => {
  try {
    const session = await findOwnedSession(req.params.sessionId, req.user);
    if (!session) {
      return res.status(404).json({ detail: 'Aptitude session not found' });
    }
    const questions = await loadSessionQuestions(session);
    res.json(sessionPayload(session, questions));
  } catch (err) {
    console.error('Get aptitude session error:', err);
    res.status(500).json({ detail: 'Failed to retrieve aptitude session' });
  }
});

function generateProceduralAptitudeQuestion(preferredDifficulty = 'medium') {
  const types = ['work_time', 'dice_prob', 'speed_distance', 'profit_loss', 'algo_complexity', 'number_series'];
  const chosenType = types[Math.floor(Math.random() * types.length)];

  if (chosenType === 'work_time') {
    const daysA = Math.floor(Math.random() * 15) + 10; // 10 to 24
    const daysB = Math.floor(Math.random() * 20) + 15; // 15 to 34
    const totalWork = daysA * daysB;
    const combinedRate = daysA + daysB;
    const combinedDays = (totalWork / combinedRate).toFixed(1);
    const correct = `${combinedDays} days`;
    const distractor1 = `${(totalWork / combinedRate - 2.5).toFixed(1)} days`;
    const distractor2 = `${(totalWork / combinedRate + 3.2).toFixed(1)} days`;
    const distractor3 = `${Math.round(daysA / 2)} days`;

    const options = [correct, distractor1, distractor2, distractor3].sort(() => Math.random() - 0.5);

    return {
      category: 'Quantitative',
      subCategory: 'Time & Work',
      difficulty: preferredDifficulty,
      questionText: `Worker A can complete a project in ${daysA} days, while Worker B can complete the same project in ${daysB} days. Working together, in approximately how many days will they finish the project?`,
      options,
      correctAnswer: correct,
      explanation: `1 day work of A = 1/${daysA}. 1 day work of B = 1/${daysB}. Combined rate = 1/${daysA} + 1/${daysB} = (${daysA}+${daysB})/(${daysA}×${daysB}) = ${combinedRate}/${totalWork}. Total days required = ${totalWork}/${combinedRate} ≈ ${combinedDays} days.`,
      companyTags: ['tcs', 'infosys', 'wipro', 'cognizant']
    };
  } else if (chosenType === 'dice_prob') {
    const targetSums = [4, 5, 6, 7, 8, 9, 10];
    const sum = targetSums[Math.floor(Math.random() * targetSums.length)];
    // count ways to get sum from 2 dice (1 to 6)
    let ways = 0;
    const pairs = [];
    for (let d1 = 1; d1 <= 6; d1++) {
      for (let d2 = 1; d2 <= 6; d2++) {
        if (d1 + d2 === sum) {
          ways++;
          pairs.push(`(${d1},${d2})`);
        }
      }
    }
    const correct = `${ways}/36`;
    const distractor1 = `${Math.min(ways + 2, 11)}/36`;
    const distractor2 = `${Math.max(ways - 1, 1)}/36`;
    const distractor3 = `${ways}/18`;
    const options = [correct, distractor1, distractor2, distractor3].sort(() => Math.random() - 0.5);

    return {
      category: 'Quantitative',
      subCategory: 'Probability',
      difficulty: preferredDifficulty,
      questionText: `Two unbiased 6-sided dice are rolled simultaneously. What is the probability of obtaining a total sum equal to ${sum}?`,
      options,
      correctAnswer: correct,
      explanation: `Total outcomes when 2 dice are rolled = 6 × 6 = 36. Favorable outcomes for sum ${sum}: [${pairs.join(', ')}] = ${ways} outcomes. Probability = ${ways}/36.`,
      companyTags: ['zoho', 'accenture', 'capgemini', 'ltimindtree']
    };
  } else if (chosenType === 'speed_distance') {
    const speedKmh = (Math.floor(Math.random() * 6) + 5) * 10; // 50, 60, 70, 80, 90, 100
    const trainLen = Math.floor(Math.random() * 5) * 50 + 150; // 150, 200, 250, 300, 350
    const platLen = Math.floor(Math.random() * 4) * 50 + 200; // 200, 250, 300, 350
    const totalDist = trainLen + platLen;
    const speedMs = (speedKmh * 5) / 18;
    const timeSec = (totalDist / speedMs).toFixed(1);

    const correct = `${timeSec} seconds`;
    const distractor1 = `${(parseFloat(timeSec) + 4.5).toFixed(1)} seconds`;
    const distractor2 = `${(parseFloat(timeSec) - 3.2).toFixed(1)} seconds`;
    const distractor3 = `${Math.round(parseFloat(timeSec) * 1.5)} seconds`;
    const options = [correct, distractor1, distractor2, distractor3].sort(() => Math.random() - 0.5);

    return {
      category: 'Quantitative',
      subCategory: 'Speed & Distance',
      difficulty: preferredDifficulty,
      questionText: `A train of length ${trainLen} meters is traveling at ${speedKmh} km/h. How long will it take to completely cross a platform of length ${platLen} meters?`,
      options,
      correctAnswer: correct,
      explanation: `Total distance to cover = Train length + Platform length = ${trainLen}m + ${platLen}m = ${totalDist}m. Speed in m/s = ${speedKmh} × (5/18) = ${speedMs.toFixed(2)} m/s. Time = Distance / Speed = ${totalDist} / ${speedMs.toFixed(2)} ≈ ${timeSec} seconds.`,
      companyTags: ['tcs', 'cognizant', 'persistent']
    };
  } else if (chosenType === 'algo_complexity') {
    const algos = [
      { name: 'Binary Search on a sorted array of size N', best: 'O(1)', avg: 'O(log N)', worst: 'O(log N)' },
      { name: 'Merge Sort algorithm on an unsorted array of size N', best: 'O(N log N)', avg: 'O(N log N)', worst: 'O(N log N)' },
      { name: 'Quick Sort partitioning with random pivot on size N', best: 'O(N log N)', avg: 'O(N log N)', worst: 'O(N^2)' },
      { name: 'Searching a key in a balanced AVL / Red-Black Tree with N nodes', best: 'O(1)', avg: 'O(log N)', worst: 'O(log N)' }
    ];
    const item = algos[Math.floor(Math.random() * algos.length)];
    const correct = item.avg;
    const options = [correct, 'O(N)', 'O(N^2)', 'O(1)'].filter((v, i, a) => a.indexOf(v) === i);
    while (options.length < 4) options.push(`O(N^${options.length})`);
    options.sort(() => Math.random() - 0.5);

    return {
      category: 'CS Fundamentals',
      subCategory: 'Algorithms & Complexity',
      difficulty: preferredDifficulty,
      questionText: `What is the average-case time complexity of ${item.name}?`,
      options,
      correctAnswer: correct,
      explanation: `For ${item.name}, the average-case time complexity is ${item.avg}. Best case: ${item.best}, Worst case: ${item.worst}.`,
      companyTags: ['zoho', 'oracle', 'infosys', 'accenture']
    };
  } else {
    // Number Series
    const start = Math.floor(Math.random() * 10) + 2;
    const diff = Math.floor(Math.random() * 5) + 3;
    const series = [start, start + diff, start + 2 * diff, start + 3 * diff, start + 4 * diff];
    const nextTerm = start + 5 * diff;
    const correct = String(nextTerm);
    const options = [correct, String(nextTerm + diff), String(nextTerm - 2), String(nextTerm + 2 * diff)].sort(() => Math.random() - 0.5);

    return {
      category: 'Logical Reasoning',
      subCategory: 'Series Completion',
      difficulty: preferredDifficulty,
      questionText: `Find the next number in the sequence: ${series.join(', ')}, ?`,
      options,
      correctAnswer: correct,
      explanation: `The sequence follows an arithmetic progression with a constant common difference of +${diff}. Next term = ${series[4]} + ${diff} = ${nextTerm}.`,
      companyTags: ['tcs', 'wipro', 'tech-mahindra']
    };
  }
}

// POST /:sessionId/next-question
router.post('/:sessionId/next-question', protect, async (req, res) => {
  try {
    const session = await findOwnedSession(req.params.sessionId, req.user);
    if (!session) {
      return res.status(404).json({ detail: 'Aptitude session not found' });
    }

    const answeredIds = session.questionsData.map(q => q.questionId);
    const targetDifficulty = session.maxDifficultyReached || 'medium';

    // 1. Try randomized MongoDB aggregation sample first
    let sampled = await QuestionBank.aggregate([
      { $match: { _id: { $nin: answeredIds }, difficulty: targetDifficulty } },
      { $sample: { size: 1 } }
    ]);

    if (!sampled || sampled.length === 0) {
      sampled = await QuestionBank.aggregate([
        { $match: { _id: { $nin: answeredIds } } },
        { $sample: { size: 1 } }
      ]);
    }

    let question = sampled && sampled.length > 0 ? sampled[0] : null;

    // 2. If all existing bank questions are answered or to guarantee fresh question generation on refresh:
    if (!question || Math.random() < 0.45) {
      const freshData = generateProceduralAptitudeQuestion(targetDifficulty);
      question = await QuestionBank.create(freshData);
    }

    res.json({
      id: question._id.toString(),
      question_id: question._id.toString(),
      category: question.category,
      sub_category: question.subCategory,
      difficulty: question.difficulty,
      question: question.questionText,
      question_text: question.questionText,
      questionText: question.questionText,
      options: question.options,
      estimated_seconds: 90,
      time_limit_seconds: 90
    });
  } catch (err) {
    console.error('Aptitude next question error:', err);
    res.status(500).json({ detail: 'Failed to get next question' });
  }
});

// Builds the scored result for a completed session from its stored per-question data.
function buildResult(session, questions) {
  const byId = new Map(questions.map(q => [q._id.toString(), q]));
  const categories = {};
  const questionAnalysis = (session.questionsData || []).map((entry, idx) => {
    const q = byId.get(String(entry.questionId));
    const category = entry.category || (q && q.category) || 'General';
    categories[category] = categories[category] || { totalQuestions: 0, correct: 0 };
    categories[category].totalQuestions += 1;
    if (entry.isCorrect) categories[category].correct += 1;

    const selectedLetter = entry.selectedLetter || null;
    const selectedText = entry.selectedAnswer || null;
    return {
      questionNumber: idx + 1,
      questionId: String(entry.questionId),
      questionText: q ? q.questionText : '',
      category,
      selectedAnswer: selectedLetter && selectedText ? `${selectedLetter}. ${selectedText}` : 'Skipped',
      correctAnswer: q ? q.correctAnswer : '',
      isCorrect: Boolean(entry.isCorrect),
      difficulty: q ? q.difficulty : 'medium',
      questionVersion: entry.questionVersion || (q ? q.version || 1 : 1),
      timeTakenSeconds: typeof entry.durationMs === 'number' ? Math.round(entry.durationMs / 1000) : null,
      explanation: (q && q.explanation) || '',
      concept: entry.subCategory || (q && q.subCategory) || '',
      // Stored explanation first; otherwise the background-generated one (marked as such)
      stepByStep: q && q.explanation ? [q.explanation] : (q && q.generatedExplanation && q.generatedExplanation.steps ? q.generatedExplanation.steps : []),
      shortcut: (q && q.generatedExplanation && q.generatedExplanation.shortcut) || '',
      explanationSource: q && q.explanation ? 'question_bank' : (q && q.generatedExplanation && q.generatedExplanation.steps ? `generated:${q.generatedExplanation.model}` : 'pending')
    };
  });

  const total = questionAnalysis.length;
  const correct = session.correctCount || 0;
  const wrong = session.wrongCount || 0;
  const startedAt = new Date(session.createdAt).getTime();
  const endedAt = session.completedAt ? new Date(session.completedAt).getTime() : Date.now();
  const timeUsedSeconds = Math.min(
    (session.durationMinutes || 15) * 60,
    Math.max(0, Math.round((endedAt - startedAt) / 1000))
  );

  return {
    sessionId: session._id.toString(),
    overallScorePercentage: session.score || 0,
    totalQuestions: total,
    correctCount: correct,
    wrongCount: wrong,
    skippedCount: session.skippedCount || 0,
    accuracyPercentage: (correct + wrong) > 0 ? Math.round((correct / (correct + wrong)) * 100) : 0,
    timeUsedSeconds,
    categoryBreakdown: Object.entries(categories).map(([category, v]) => ({
      category,
      totalQuestions: v.totalQuestions,
      correct: v.correct,
      scorePercentage: v.totalQuestions ? Math.round((v.correct / v.totalQuestions) * 100) : 0
    })),
    questionAnalysis,
    weakTopics: session.weakTopics || [],
    masteryChanges: session.masteryChanges || [],
    lateAnswersIgnored: session.lateAnswers || 0,
    xpEarned: session.xpEarned || 0,
    streakMaintained: true
  };
}

function isAnswerCorrect(question, chosenText) {
  return aptitudeService.answersMatch(chosenText, question.correctAnswer, question.numericTolerance);
}

// POST /:sessionId/answer — records one answer with server-side timing
router.post('/:sessionId/answer', protect, async (req, res) => {
  try {
    const session = await findOwnedSession(req.params.sessionId, req.user);
    if (!session) return res.status(404).json({ detail: 'Session not found' });
    if (session.status === 'completed') return res.status(409).json({ detail: 'This test has already been submitted' });
    const questionId = req.body.questionId || req.body.question_id;
    const option = String(req.body.selectedOption || req.body.option || '').toUpperCase();
    if (!mongoose.isValidObjectId(questionId) || !OPTION_LETTERS.includes(option)) {
      return res.status(400).json({ detail: 'questionId and selectedOption (A-D) are required' });
    }
    const question = await QuestionBank.findById(questionId);
    if (!question) return res.status(404).json({ detail: 'Question not found' });
    const attempt = await aptitudeService.recordAttempt(session, question, option);
    // Correctness is not revealed until the test is submitted
    res.json({ recorded: true, questionId, selectedOption: option, durationMs: attempt.durationMs, afterDeadline: attempt.afterDeadline });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ detail: err.message });
    console.error('Aptitude answer error:', err);
    res.status(500).json({ detail: 'Failed to record answer' });
  }
});

// POST /:sessionId/submit
router.post('/:sessionId/submit', protect, async (req, res) => {
  try {
    const session = await findOwnedSession(req.params.sessionId, req.user);
    if (!session) {
      return res.status(404).json({ detail: 'Session not found' });
    }
    const questions = await loadSessionQuestions(session);

    // Case 1: Batch submission of the whole test
    if (req.body.answers && typeof req.body.answers === 'object') {
      if (session.status === 'completed') {
        // Re-submitting returns the stored result; it never re-scores or re-awards XP.
        return res.json(buildResult(session, questions));
      }
      const previousStatus = session.status;
      if (!(await claimCompletion(session))) {
        // Another request submitted this test a moment ago: wait for it to save its score, then return that result
        let stored = await AptitudeSession.findById(session._id);
        for (let i = 0; i < 40 && stored && !stored.totalQuestions; i++) {
          await new Promise(r => setTimeout(r, 250));
          stored = await AptitudeSession.findById(session._id);
        }
        return res.json(buildResult(stored, questions));
      }

      let scored;
      try {
        scored = await aptitudeService.scoreSession(session, questions, req.body.answers);
      } catch (err) {
        await AptitudeSession.updateOne({ _id: session._id }, { $set: { status: previousStatus, completedAt: null } });
        throw err;
      }
      session.questionsData = scored.questionsData;
      const correct = scored.correct;
      const wrong = scored.wrong;
      const skipped = scored.skipped;
      const weakTopics = new Set(scored.weakTopics);
      session.lateAnswers = scored.late;
      session.masteryChanges = await aptitudeService.updateAptitudeMastery(req.user._id, scored.perCategory);
      await aptitudeService.enqueueMissingExplanations(questions);

      const total = session.questionsData.length || 1;
      session.score = Math.round((correct / total) * 100);
      session.totalQuestions = session.questionsData.length;
      session.correctCount = correct;
      session.wrongCount = wrong;
      session.skippedCount = skipped;
      session.weakTopics = Array.from(weakTopics);
      session.status = 'completed';
      session.completedAt = new Date();

      const xp = session.mode === 'daily' ? DAILY_QUEST_XP : SESSION_XP;
      session.xpEarned = xp;
      await session.save();

      recordPractice(req.user, xp);
      await req.user.save();

      return res.json(buildResult(session, questions));
    }

    // Case 2: Single question submit (adaptive test mode)
    if (session.status === 'completed') {
      return res.status(409).json({ detail: 'This test has already been submitted' });
    }
    const { question_id, questionId, selected_answer, selectedAnswer, selected_index } = req.body;
    const qid = question_id || questionId;
    if (!mongoose.isValidObjectId(qid)) {
      return res.status(404).json({ detail: 'Question not found' });
    }
    const question = await QuestionBank.findById(qid);
    if (!question) {
      return res.status(404).json({ detail: 'Question not found' });
    }

    let ans = selected_answer || selectedAnswer;
    if (ans == null && selected_index != null && question.options[selected_index]) {
      ans = question.options[selected_index];
    }

    const correctIndex = question.options.findIndex(
      o => o.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase()
    );

    const isCorrect = isAnswerCorrect(question, ans || '');
    session.totalQuestions += 1;
    if (isCorrect) {
      session.correctCount += 1;
      session.maxDifficultyReached = session.maxDifficultyReached === 'easy' ? 'medium' : 'hard';
    } else {
      session.wrongCount += 1;
      if (!session.weakTopics.includes(question.subCategory)) {
        session.weakTopics.push(question.subCategory);
      }
    }

    session.questionsData.push({
      questionId: question._id,
      selectedAnswer: ans,
      isCorrect,
      category: question.category,
      subCategory: question.subCategory
    });

    session.score = Math.round((session.correctCount / session.totalQuestions) * 100);
    await session.save();

    res.json({
      is_correct: isCorrect,
      isCorrect,
      correct_index: correctIndex >= 0 ? correctIndex : 0,
      correct_answer: question.correctAnswer,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      solution: { explanation: question.explanation },
      current_score: session.score,
      total_answered: session.totalQuestions
    });
  } catch (err) {
    console.error('Aptitude submit error:', err);
    res.status(500).json({ detail: 'Failed to submit answer' });
  }
});

function categoryScoresOf(result) {
  const out = {};
  result.categoryBreakdown.forEach(c => {
    out[c.category] = { correct: c.correct, total: c.totalQuestions, weighted_pct: c.scorePercentage };
  });
  return out;
}

// POST /:sessionId/end — finishes an adaptive (single-question) session
router.post('/:sessionId/end', protect, async (req, res) => {
  try {
    const session = await findOwnedSession(req.params.sessionId, req.user);
    if (!session) {
      return res.status(404).json({ detail: 'Aptitude session not found' });
    }

    let xpAwarded = 0;
    if (session.status !== 'completed' && await claimCompletion(session)) {
      session.status = 'completed';
      session.completedAt = new Date();
      xpAwarded = 30;
      session.xpEarned = xpAwarded;
      await session.save();
      recordPractice(req.user, xpAwarded);
      await req.user.save();
    }

    const result = buildResult(session, await loadSessionQuestions(session));
    res.json({
      id: session._id.toString(),
      user_id: session.userId.toString(),
      job_role: session.jobRole,
      mode: session.mode,
      status: 'completed',
      score: session.score || 0,
      total_questions: session.totalQuestions || 0,
      correct_count: session.correctCount || 0,
      wrong_count: session.wrongCount || 0,
      skipped_count: session.skippedCount || 0,
      max_difficulty_reached: session.maxDifficultyReached || 'medium',
      category_scores: categoryScoresOf(result),
      weak_topics: session.weakTopics || [],
      xp_awarded: xpAwarded
    });
  } catch (err) {
    console.error('Aptitude end error:', err);
    res.status(500).json({ detail: 'Failed to end aptitude test' });
  }
});

// GET /:sessionId/report
router.get(['/:sessionId/report', '/:sessionId/results'], protect, async (req, res) => {
  try {
    const session = await findOwnedSession(req.params.sessionId, req.user);
    if (!session) {
      return res.status(404).json({ detail: 'Session not found' });
    }
    const result = buildResult(session, await loadSessionQuestions(session));
    res.json({
      ...result,
      id: session._id.toString(),
      user_id: session.userId.toString(),
      job_role: session.jobRole,
      mode: session.mode,
      status: session.status,
      score: session.score || 0,
      total_questions: session.totalQuestions || 0,
      correct_count: session.correctCount || 0,
      wrong_count: session.wrongCount || 0,
      skipped_count: session.skippedCount || 0,
      max_difficulty_reached: session.maxDifficultyReached || 'medium',
      weak_topics: session.weakTopics || [],
      category_scores: categoryScoresOf(result),
      recommendation: (session.score || 0) >= 70
        ? 'Strong aptitude fundamentals.'
        : `Focus on: ${(session.weakTopics || []).slice(0, 3).join(', ') || 'mixed practice drills'}.`
    });
  } catch (err) {
    console.error('Aptitude report error:', err);
    res.status(500).json({ detail: 'Failed to fetch aptitude report' });
  }
});

module.exports = router;
