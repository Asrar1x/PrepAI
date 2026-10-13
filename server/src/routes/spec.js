/**
 * Spec §21 API surface not covered by the feature routers. Responses use the spec envelope
 * { status, data, message, request_id }.
 */
const express = require('express');
const mongoose = require('mongoose');
const { protect, requireRoles } = require('../middleware/auth');
const { reportLimiter } = require('../middleware/rateLimiter');
const User = require('../models/User');
const TopicMastery = require('../models/TopicMastery');
const AnswerEvaluation = require('../models/AnswerEvaluation');
const EvaluationSignal = require('../models/EvaluationSignal');
const InterviewTurn = require('../models/InterviewTurn');
const InterviewSession = require('../models/InterviewSession');
const AptitudeSession = require('../models/AptitudeSession');
const Notification = require('../models/Notification');
const { buildDashboard, loadCompletedSessions, activityHeatmap, computeReadinessFromSessions, buildCompanyReadiness } = require('../services/studentAnalytics');
const { generateFromMastery, getActivePlan, setItemStatus, serializePlan } = require('../services/studyPlanService');
const { evaluateTurn } = require('../services/interviewService');
const { bandFor } = require('../services/adaptiveEngine');
const { audit } = require('../services/observability');

const router = express.Router();
const STAFF = ['admin', 'placement_officer', 'recruiter'];

const ok = (req, res, data, message = 'ok', code = 200) => res.status(code).json({ status: 'success', data, message, request_id: req.requestId });
const fail = (req, res, code, message) => res.status(code).json({ status: 'error', data: null, message, detail: message, request_id: req.requestId });

function profileOf(u) {
  return {
    id: u._id.toString(),
    email: u.email,
    fullName: u.fullName,
    role: u.role,
    education: { collegeName: u.collegeName, branch: u.branch, graduationYear: u.graduationYear },
    targetRole: (u.targetRoles && u.targetRoles[0]) || null,
    targetRoles: u.targetRoles || [],
    targetCompanies: u.targetCompanies || [],
    createdAt: u.createdAt
  };
}

// ---- Profile ---------------------------------------------------------------
router.get('/profile', protect, (req, res) => ok(req, res, profileOf(req.user)));

router.patch('/profile', protect, async (req, res) => {
  const u = req.user;
  const b = req.body || {};
  if (typeof b.fullName === 'string' && b.fullName.trim().length >= 2) u.fullName = b.fullName.trim().slice(0, 100);
  if (typeof b.collegeName === 'string') u.collegeName = b.collegeName.trim().slice(0, 150);
  if (typeof b.branch === 'string') u.branch = b.branch.trim().slice(0, 100);
  if (Number.isInteger(Number(b.graduationYear)) && Number(b.graduationYear) >= 2000 && Number(b.graduationYear) <= 2040) u.graduationYear = Number(b.graduationYear);
  if (typeof b.targetRole === 'string' && b.targetRole.trim()) u.targetRoles = [b.targetRole.trim().slice(0, 100)];
  if (typeof b.targetCompany === 'string') u.targetCompanies = b.targetCompany.trim() ? [b.targetCompany.trim().slice(0, 80)] : [];
  await u.save();
  ok(req, res, profileOf(u), 'Profile updated');
});

router.get('/profile/readiness', protect, async (req, res) => {
  const { interviews, aptitudes } = await loadCompletedSessions(req.user._id);
  const r = computeReadinessFromSessions(interviews, aptitudes);
  ok(req, res, {
    readinessIndex: r.score,
    components: { interviewAverage: r.interviewAvg, aptitudeAverage: r.aptitudeAvg, interviewWeight: 0.6, aptitudeWeight: 0.4 },
    basis: { interviews: interviews.length, aptitudeTests: aptitudes.length },
    explanation: interviews.length + aptitudes.length === 0
      ? 'No completed practice yet.'
      : 'Readiness = 60% average mock-interview score + 40% average aptitude score (only components with data are used).'
  });
});

// ---- Company readiness -----------------------------------------------------
router.get('/companies/:id/readiness', protect, async (req, res) => {
  const { interviews, aptitudes } = await loadCompletedSessions(req.user._id);
  const key = String(req.params.id).toLowerCase();
  const row = buildCompanyReadiness(interviews, aptitudes).find(c => c.companyId === key || c.companyName.toLowerCase() === key);
  ok(req, res, row || { companyId: key, readinessPercentage: null, practiceCount: 0, message: 'No practice for this company yet.' });
});

// ---- Evaluations -----------------------------------------------------------
async function ownedEvaluation(id, user) {
  if (!mongoose.isValidObjectId(id)) return null;
  const ev = await AnswerEvaluation.findById(id);
  if (!ev) return null;
  if (STAFF.includes(user.role) || (ev.userId && ev.userId.toString() === user._id.toString())) return ev;
  return null;
}

router.get('/evaluations/:id', protect, async (req, res) => {
  const ev = await ownedEvaluation(req.params.id, req.user);
  if (!ev) return fail(req, res, 404, 'Evaluation not found');
  const signals = await EvaluationSignal.find({ evaluationId: ev._id });
  ok(req, res, { ...ev.toJSON(), signals: signals.map(s => s.toJSON()) });
});

router.post('/evaluations/:id/retry', protect, reportLimiter, async (req, res) => {
  const ev = await ownedEvaluation(req.params.id, req.user);
  if (!ev) return fail(req, res, 404, 'Evaluation not found');
  if (!ev.turnId) return fail(req, res, 409, 'This evaluation is not linked to an interview turn');
  const turn = await InterviewTurn.findById(ev.turnId);
  const session = await InterviewSession.findById(ev.sessionId);
  if (!turn || !session) return fail(req, res, 404, 'The interview answer for this evaluation no longer exists');
  turn.evaluationStatus = 'pending';
  const out = await evaluateTurn(turn, session);
  ok(req, res, out ? out.doc.toJSON() : null, out && out.result.status === 'failed' ? 'Evaluation failed again' : 'Re-evaluated');
});

// ---- Mastery ---------------------------------------------------------------
function masteryRow(m) {
  return {
    topic: m.topic,
    source: m.source,
    mastery: m.masteryScore,
    band: m.band || bandFor(m.masteryScore).band,
    difficulty: m.difficulty,
    attempts: m.attemptsCount,
    recentResults: m.recentResults,
    transitions: m.transitions,
    strengths: m.strengths,
    weaknesses: m.weaknesses,
    updatedAt: m.updatedAt
  };
}

router.get('/mastery', protect, async (req, res) => {
  const rows = await TopicMastery.find({ userId: req.user._id }).sort({ masteryScore: 1 });
  ok(req, res, rows.map(masteryRow));
});

router.get('/mastery/trends', protect, async (req, res) => {
  const rows = await TopicMastery.find({ userId: req.user._id });
  ok(req, res, rows.map(m => ({ topic: m.topic, source: m.source, points: (m.recentResults || []).map(r => ({ at: r.at, score: r.score, difficulty: r.difficulty })) })));
});

router.get('/mastery/:topic', protect, async (req, res) => {
  const rows = await TopicMastery.find({ userId: req.user._id, topic: req.params.topic });
  if (!rows.length) return fail(req, res, 404, 'No mastery recorded for this topic yet');
  ok(req, res, rows.map(masteryRow));
});

// ---- Study plan ------------------------------------------------------------
// ---- Interview memory (what the interviewer remembers from earlier interviews) ----
router.get('/memory', protect, async (req, res) => {
  const interviewMemory = require('../services/interviewMemory');
  const history = await interviewMemory.historySummary(req.user._id);
  const rows = await interviewMemory.loadMemories(req.user._id);
  ok(req, res, {
    interviewsRemembered: history.sessions.length,
    answersRemembered: history.answerCount,
    topics: history.topics,
    recurringWeaknesses: history.recurring,
    recent: rows.filter(r => r.kind === 'answer').slice(0, 20).map(r => ({
      topic: r.topic, question: r.question, score: r.score, verdict: r.verdict, missingConcepts: r.missingConcepts, date: r.occurredAt
    }))
  });
});

router.delete('/memory', protect, async (req, res) => {
  const interviewMemory = require('../services/interviewMemory');
  const removed = await interviewMemory.forgetUser(req.user._id);
  await audit(req, 'memory.cleared', { targetType: 'user', targetId: req.user._id, details: { removed } });
  ok(req, res, { removed }, 'Interview memory cleared');
});

router.get('/study-plan', protect, async (req, res) => {
  ok(req, res, serializePlan(await getActivePlan(req.user._id)));
});

router.post('/study-plan/generate', protect, reportLimiter, async (req, res) => {
  const plan = await generateFromMastery(req.user._id, (req.user.targetRoles || [])[0] || null);
  if (!plan) return fail(req, res, 409, 'Complete an aptitude test or a mock interview first so the plan can target real weaknesses.');
  ok(req, res, serializePlan(plan), 'Study plan generated', 201);
});

router.patch('/study-plan/items/:id', protect, async (req, res) => {
  const done = req.body.status ? req.body.status === 'done' : req.body.isCompleted !== false;
  const plan = await setItemStatus(req.user._id, String(req.params.id), done);
  if (!plan) return fail(req, res, 404, 'Study plan item not found');
  ok(req, res, serializePlan(plan), 'Updated');
});

// ---- Dashboard -------------------------------------------------------------
router.get('/dashboard/summary', protect, async (req, res) => ok(req, res, await buildDashboard(req.user)));

router.get('/dashboard/activity', protect, async (req, res) => {
  const { interviews, aptitudes } = await loadCompletedSessions(req.user._id);
  const heatmap = activityHeatmap(interviews, aptitudes, 90);
  ok(req, res, { totalActiveDays: heatmap.filter(d => d.count > 0).length, heatmap });
});

router.get('/dashboard/analytics', protect, async (req, res) => {
  const userId = req.user._id;
  const evals = await AnswerEvaluation.find({ userId, status: 'completed' }).sort({ createdAt: 1 });
  const turns = await InterviewTurn.find({ userId, answer: { $ne: null } }, { speech: 1, answeredAt: 1 }).sort({ answeredAt: 1 });
  const sessions = await InterviewSession.countDocuments({ userId });
  const completed = await InterviewSession.countDocuments({ userId, status: 'completed' });
  const aptitudes = await AptitudeSession.find({ userId, status: 'completed' }, { score: 1, createdAt: 1 }).sort({ createdAt: 1 });
  const conceptErrors = {};
  evals.forEach(e => (e.missingConcepts || []).forEach(c => { conceptErrors[c] = (conceptErrors[c] || 0) + 1; }));
  ok(req, res, {
    dimensionTrend: evals.map(e => ({ at: e.createdAt, topic: e.topic, overall: e.overall, ...e.dimensions })),
    conceptErrorRecurrence: Object.entries(conceptErrors).filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([concept, count]) => ({ concept, count })),
    sessionCompletionRate: sessions ? Number((completed / sessions).toFixed(2)) : null,
    latencyTrend: turns.filter(t => typeof t.speech?.responseLatencyMs === 'number').map(t => ({ at: t.answeredAt, responseLatencyMs: t.speech.responseLatencyMs })),
    fillerTrend: turns.map(t => ({ at: t.answeredAt, fillerWords: t.speech?.fillerWordCount || 0, words: t.speech?.wordCount || 0 })),
    aptitudeTrend: aptitudes.map(a => ({ at: a.createdAt, score: a.score }))
  });
});

// ---- Notifications ---------------------------------------------------------
router.get('/notifications', protect, async (req, res) => {
  const list = await Notification.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(50);
  ok(req, res, list.map(n => n.toJSON()));
});

router.post('/notifications/:id/read', protect, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return fail(req, res, 404, 'Notification not found');
  const n = await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, { isRead: true }, { new: true });
  if (!n) return fail(req, res, 404, 'Notification not found');
  ok(req, res, n.toJSON());
});

// ---- Admin drill-down ------------------------------------------------------
router.get('/admin/students/:id', protect, requireRoles(STAFF), async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return fail(req, res, 404, 'Student not found');
  const student = await User.findOne({ _id: req.params.id, role: 'student' });
  if (!student) return fail(req, res, 404, 'Student not found');
  const { interviews, aptitudes } = await loadCompletedSessions(student._id);
  const mastery = await TopicMastery.find({ userId: student._id }).sort({ masteryScore: 1 });
  await audit(req, 'admin.student_viewed', { targetType: 'user', targetId: student._id });
  ok(req, res, {
    profile: profileOf(student),
    readiness: computeReadinessFromSessions(interviews, aptitudes),
    interviews: interviews.map(s => ({ sessionId: s._id.toString(), interviewType: s.interviewType, company: s.companyTarget, score: s.overallScore, date: s.createdAt })),
    aptitudeTests: aptitudes.map(a => ({ sessionId: a._id.toString(), pattern: a.companyPattern, score: a.score, date: a.createdAt })),
    mastery: mastery.map(masteryRow),
    streak: student.currentStreak,
    xp: student.totalXp
  });
});

router.get('/admin/batches/:id', protect, requireRoles(STAFF), async (req, res) => {
  const year = Number(String(req.params.id).replace(/\D/g, ''));
  if (!year) return fail(req, res, 404, 'Batch not found');
  const students = await User.find({ role: 'student', graduationYear: year });
  const rows = [];
  for (const s of students) {
    const { interviews, aptitudes } = await loadCompletedSessions(s._id);
    const r = computeReadinessFromSessions(interviews, aptitudes);
    rows.push({ id: s._id.toString(), name: s.fullName, branch: s.branch, readiness: r.score, interviews: interviews.length, aptitudeTests: aptitudes.length });
  }
  ok(req, res, { batch: `${year} Batch`, graduationYear: year, students: rows, studentCount: rows.length, readyCount: rows.filter(r => r.readiness >= 70).length });
});

module.exports = router;
