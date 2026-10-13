const express = require('express');
const mongoose = require('mongoose');
const { protect, requireRoles } = require('../middleware/auth');
const Notification = require('../models/Notification');
const { setItemStatus } = require('../services/studyPlanService');
const { audit } = require('../services/observability');
const { buildDashboard, loadCompletedSessions, activityHeatmap, buildCompanyReadiness, computeAllReadiness, average, toPercent, percentileOf } = require('../services/studentAnalytics');
const User = require('../models/User');
const AptitudeSession = require('../models/AptitudeSession');
const InterviewSession = require('../models/InterviewSession');
const Resume = require('../models/Resume');
const { handleResumeUpload, upload } = require('./resumes');

const router = express.Router();

function getGamificationStats(totalXp = 0) {
  let level = 1;
  let levelTitle = 'Level 1: Novice Applicant';
  let minXp = 0;
  let maxXp = 300;

  if (totalXp >= 2000) {
    level = 5;
    levelTitle = 'Level 5: Elite Offer Holder';
    minXp = 2000;
    maxXp = 3500;
  } else if (totalXp >= 1200) {
    level = 4;
    levelTitle = 'Level 4: Placement Ready';
    minXp = 1200;
    maxXp = 2000;
  } else if (totalXp >= 700) {
    level = 3;
    levelTitle = 'Level 3: Technical Contender';
    minXp = 700;
    maxXp = 1200;
  } else if (totalXp >= 300) {
    level = 2;
    levelTitle = 'Level 2: Aptitude Ace';
    minXp = 300;
    maxXp = 700;
  }

  const progress = Math.min(100, Math.max(0, Math.round(((totalXp - minXp) / (maxXp - minXp)) * 100)));
  const xpNeeded = Math.max(0, maxXp - totalXp);

  return {
    level,
    levelTitle,
    minXp,
    maxXp,
    progress,
    xpNeeded
  };
}

// GET /me
router.get('/me', protect, async (req, res) => {
  const user = req.user.toJSON();
  const gamify = getGamificationStats(user.totalXp || 0);

  const profileData = {
    id: user.id,
    email: user.email,
    full_name: user.fullName,
    fullName: user.fullName,
    college_name: user.collegeName,
    collegeName: user.collegeName,
    branch: user.branch,
    graduation_year: user.graduationYear,
    graduationYear: user.graduationYear,
    target_roles: user.targetRoles,
    targetRoles: user.targetRoles,
    current_streak: user.currentStreak,
    currentStreak: user.currentStreak,
    longest_streak: user.longestStreak,
    longestStreak: user.longestStreak,
    total_xp: user.totalXp,
    totalXp: user.totalXp,
    level: gamify.level,
    levelTitle: gamify.levelTitle,
    level_title: gamify.levelTitle,
    level_progress: gamify.progress,
    xp_needed: gamify.xpNeeded,
    next_level_xp: gamify.maxXp,
    badges: req.user.badges || [],
    daily_quests: todaysQuestState(req.user),
    role: user.role,
    isActive: user.isActive,
    last_active: user.lastActive
  };

  res.json({
    status: 'success',
    data: profileData,
    ...profileData
  });
});

// PUT /me/profile
router.put('/me/profile', protect, async (req, res) => {
  const { fullName, full_name, collegeName, college_name, branch, graduationYear, graduation_year, targetRoles, target_roles } = req.body;
  const user = req.user;

  // Validate every field's type and size before it reaches the database
  const text = (v, max) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
  const name = text(fullName || full_name, 100);
  const college = text(collegeName || college_name, 150);
  const branchText = text(branch, 100);
  if ((fullName || full_name) && !name) return res.status(400).json({ detail: 'Full name must be text.' });
  if (name) user.fullName = name;
  if (college) user.collegeName = college;
  if (branchText) user.branch = branchText;
  const yearInput = graduationYear || graduation_year;
  if (yearInput !== undefined && yearInput !== null && yearInput !== '') {
    const year = Number(yearInput);
    if (!Number.isInteger(year) || year < 2000 || year > 2040) {
      return res.status(400).json({ detail: 'Graduation year must be a year between 2000 and 2040.' });
    }
    user.graduationYear = year;
  }
  const roles = targetRoles || target_roles;
  if (roles) {
    const list = (Array.isArray(roles) ? roles : [roles]).map(r => text(r, 100)).filter(Boolean).slice(0, 5);
    if (list.length) user.targetRoles = list;
  }
  const companies = req.body.targetCompanies ?? req.body.target_companies;
  if (companies !== undefined) {
    user.targetCompanies = (Array.isArray(companies) ? companies : [companies])
      .map(c => String(c || '').trim().slice(0, 80))
      .filter(Boolean)
      .slice(0, 5);
  }

  await user.save();
  const gamify = getGamificationStats(user.totalXp || 0);

  res.json({
    status: 'success',
    message: 'Profile updated successfully',
    user: {
      ...user.toJSON(),
      level: gamify.level,
      levelTitle: gamify.levelTitle,
      level_progress: gamify.progress
    }
  });
});

// GET /me/dashboard — every number is computed from the user's real sessions
router.get('/me/dashboard', protect, async (req, res) => {
  try {
    res.json(await buildDashboard(req.user));
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ detail: 'Failed to load dashboard' });
  }
});

// GET /me/activity
router.get('/me/activity', protect, async (req, res) => {
  try {
    const { interviews, aptitudes } = await loadCompletedSessions(req.user._id);
    const heatmap = activityHeatmap(interviews, aptitudes, 30);
    res.json({
      total_active_days: heatmap.filter(d => d.count > 0).length,
      heatmap
    });
  } catch (err) {
    console.error('Activity error:', err);
    res.status(500).json({ detail: 'Failed to load activity' });
  }
});

// GET /me/company-readiness
router.get('/me/company-readiness', protect, async (req, res) => {
  try {
    const { interviews, aptitudes } = await loadCompletedSessions(req.user._id);
    res.json(buildCompanyReadiness(interviews, aptitudes).map(c => ({
      company: c.companyName,
      readiness: c.readinessPercentage,
      practice_count: c.practiceCount,
      status: c.readinessPercentage >= 80 ? 'Interview Ready' : c.readinessPercentage >= 60 ? 'Moderate Prep' : 'High Prep Required'
    })));
  } catch (err) {
    console.error('Company readiness error:', err);
    res.status(500).json({ detail: 'Failed to load company readiness' });
  }
});

const DAILY_QUESTS = [
  { id: 'q1', title: 'Complete 1 Adaptive Aptitude Test', xp: 50 },
  { id: 'q2', title: 'Engage in 1 AI Mock Interview Turn', xp: 75 },
  { id: 'q3', title: 'Upload or Rescan Resume with ATS', xp: 35 }
];

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// Whether the activity behind each quest really happened today
async function questEligibility(userId) {
  const since = startOfToday();
  const [aptitude, interview, resume] = await Promise.all([
    AptitudeSession.exists({ userId, status: 'completed', updatedAt: { $gte: since } }),
    InterviewSession.exists({ userId, updatedAt: { $gte: since }, 'transcript.1': { $exists: true } }),
    Resume.exists({ userId, createdAt: { $gte: since } })
  ]);
  return { q1: Boolean(aptitude), q2: Boolean(interview), q3: Boolean(resume) };
}

// Quests reset each day; claimed state is kept per quest id with the claim date.
function todaysQuestState(user) {
  const today = startOfToday().getTime();
  return DAILY_QUESTS.map(q => {
    const stored = (user.dailyQuests || []).find(d => d.id === q.id);
    const claimedToday = Boolean(stored && stored.completed && stored.claimedAt && new Date(stored.claimedAt).getTime() >= today);
    return { ...q, completed: claimedToday, claimedAt: claimedToday ? stored.claimedAt : null };
  });
}

// GET /me/quests
router.get('/me/quests', protect, async (req, res) => {
  try {
    const eligible = await questEligibility(req.user._id);
    res.json(todaysQuestState(req.user).map(q => ({ ...q, eligible: eligible[q.id] })));
  } catch (err) {
    res.status(500).json({ detail: 'Failed to load quests' });
  }
});

// PUT /me/claim-quest
router.put('/me/claim-quest', protect, async (req, res) => {
  try {
    const { questId } = req.body;
    const user = req.user;
    const quests = todaysQuestState(user);
    const quest = quests.find(q => q.id === questId);
    if (!quest) {
      return res.status(404).json({ detail: 'Quest not found' });
    }
    if (quest.completed) {
      return res.status(409).json({ detail: 'Quest reward already claimed today' });
    }
    const eligible = await questEligibility(user._id);
    if (!eligible[questId]) {
      return res.status(400).json({ detail: `Complete the activity first: ${quest.title}` });
    }

    quest.completed = true;
    quest.claimedAt = new Date();
    user.dailyQuests = quests.map(({ id, title, xp, completed, claimedAt }) => ({ id, title, xp, completed, claimedAt }));
    user.totalXp = (user.totalXp || 0) + quest.xp;
    const gamify = getGamificationStats(user.totalXp);
    user.level = gamify.level;
    user.levelTitle = gamify.levelTitle;
    await user.save();

    res.json({
      status: 'success',
      message: `Quest reward claimed: +${quest.xp} XP`,
      total_xp: user.totalXp,
      level: gamify.level,
      levelTitle: gamify.levelTitle,
      daily_quests: user.dailyQuests
    });
  } catch (err) {
    console.error('Claim quest error:', err);
    res.status(500).json({ detail: 'Failed to claim quest' });
  }
});

// PUT /me/xp — manual XP adjustment is a staff-only operation; students earn XP from activities
router.put('/me/xp', protect, requireRoles(['admin', 'placement_officer']), async (req, res) => {
  const points = Number(req.body.points || req.body.xp || 0);
  if (!Number.isFinite(points) || points <= 0 || points > 1000) {
    return res.status(400).json({ detail: 'points must be between 1 and 1000' });
  }
  // Staff adjust a student's XP — the student must be named explicitly (never the caller)
  const targetId = req.body.userId || req.body.studentId;
  if (!mongoose.isValidObjectId(targetId)) {
    return res.status(400).json({ detail: 'userId of the student to reward is required' });
  }
  const target = await User.findOne({ _id: targetId, role: 'student' });
  if (!target) return res.status(404).json({ detail: 'Student not found' });
  target.totalXp = (target.totalXp || 0) + points;
  await audit(req, 'admin.xp_adjusted', { targetType: 'user', targetId: target._id, details: { points } });
  const gamify = getGamificationStats(target.totalXp);
  target.level = gamify.level;
  target.levelTitle = gamify.levelTitle;
  await target.save();

  res.json({
    status: 'success',
    userId: target._id.toString(),
    total_xp: target.totalXp,
    level: gamify.level,
    levelTitle: gamify.levelTitle,
    awarded: points
  });
});

// PUT /me/study-plan/:taskId — mark a dashboard study-plan task done / not done
router.put('/me/study-plan/:taskId', protect, async (req, res) => {
  try {
    const taskId = String(req.params.taskId || '').slice(0, 120);
    // Items of a persisted study plan
    const plan = await setItemStatus(req.user._id, taskId, req.body.isCompleted !== false);
    if (plan) return res.json({ status: 'success', taskId, isCompleted: req.body.isCompleted !== false });
    // Starter tasks shown before any plan exists
    const done = new Set(req.user.completedStudyTasks || []);
    if (req.body.isCompleted === false) done.delete(taskId);
    else done.add(taskId);
    // Task ids are date-prefixed; keep only the last 60 to bound the document size
    req.user.completedStudyTasks = Array.from(done).slice(-60);
    await req.user.save();
    res.json({ status: 'success', taskId, isCompleted: req.body.isCompleted !== false });
  } catch (err) {
    console.error('Study plan update error:', err);
    res.status(500).json({ detail: 'Failed to update study plan' });
  }
});

// GET /me/notifications
router.get('/me/notifications', protect, async (req, res) => {
  try {
    const list = await Notification.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(50);
    res.json(list.map(n => n.toJSON()));
  } catch (err) {
    res.status(500).json({ detail: 'Failed to load notifications' });
  }
});

// GET /me/notifications/preferences
router.get('/me/notifications/preferences', protect, (req, res) => {
  res.json(req.user.notificationPrefs || {});
});

const PREF_KEYS = ['dailyReminder', 'interviewReportReady', 'streakAlert', 'companyDriveActivated', 'weeklyProgressReport', 'placementCountdown', 'studyPlanBehind', 'pushEnabled', 'whatsappEnabled'];

// PUT /me/notifications/preferences
router.put('/me/notifications/preferences', protect, async (req, res) => {
  try {
    const prefs = { ...(req.user.notificationPrefs || {}) };
    PREF_KEYS.forEach(k => {
      if (typeof req.body[k] === 'boolean') prefs[k] = req.body[k];
    });
    req.user.notificationPrefs = prefs;
    req.user.markModified('notificationPrefs');
    await req.user.save();
    res.json(prefs);
  } catch (err) {
    res.status(500).json({ detail: 'Failed to save notification preferences' });
  }
});

// PUT /me/notifications/:id/read
router.put('/me/notifications/:id/read', protect, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ detail: 'Notification not found' });
    }
    const n = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { isRead: true },
      { new: true }
    );
    if (!n) return res.status(404).json({ detail: 'Notification not found' });
    res.json(n.toJSON());
  } catch (err) {
    res.status(500).json({ detail: 'Failed to update notification' });
  }
});

const RANGE_DAYS = { '7d': 7, '30d': 30, '90d': 90 };

// GET /me/progress?range=7d|30d|90d|all
router.get('/me/progress', protect, async (req, res) => {
  try {
    const range = RANGE_DAYS[req.query.range] ? req.query.range : (req.query.range === 'all' ? 'all' : '30d');
    const days = RANGE_DAYS[range] || null;
    const now = Date.now();
    const since = days ? new Date(now - days * 86400000) : new Date(0);
    const prevSince = days ? new Date(now - 2 * days * 86400000) : null;

    const { interviews, aptitudes } = await loadCompletedSessions(req.user._id);
    const inRange = list => list.filter(s => new Date(s.createdAt) >= since);
    const inPrev = list => (prevSince ? list.filter(s => new Date(s.createdAt) >= prevSince && new Date(s.createdAt) < since) : []);

    const iNow = inRange(interviews);
    const aNow = inRange(aptitudes);
    const avgMock = average(iNow.map(s => toPercent(s.overallScore)));
    const prevMock = average(inPrev(interviews).map(s => toPercent(s.overallScore)));
    const avgAptitude = average(aNow.map(s => s.score));
    const interviewSeconds = iNow.reduce((sum, s) => sum + (s.durationSeconds || 0), 0);

    const allReadiness = await computeAllReadiness();
    const mine = allReadiness.get(req.user._id.toString());
    const scores = Array.from(allReadiness.values()).map(v => v.readiness);

    // Daily buckets for short ranges, weekly buckets otherwise
    const bucketDays = days && days <= 30 ? 1 : 7;
    const buckets = new Map();
    const bucketKey = d => {
      const t = new Date(d);
      t.setHours(0, 0, 0, 0);
      if (bucketDays === 7) t.setDate(t.getDate() - t.getDay());
      // Local calendar date (toISOString would shift it a day earlier east of UTC, e.g. IST)
      return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
    };
    iNow.forEach(s => {
      const k = bucketKey(s.createdAt);
      const b = buckets.get(k) || { interview: [], aptitude: [] };
      b.interview.push(toPercent(s.overallScore));
      buckets.set(k, b);
    });
    aNow.forEach(s => {
      const k = bucketKey(s.createdAt);
      const b = buckets.get(k) || { interview: [], aptitude: [] };
      b.aptitude.push(s.score);
      buckets.set(k, b);
    });
    const timeline = Array.from(buckets.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([k, b]) => ({
      date: new Date(`${k}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      interview: average(b.interview),
      aptitude: average(b.aptitude)
    }));

    const cats = {};
    aNow.forEach(s => (s.questionsData || []).forEach(q => {
      if (typeof q.isCorrect !== 'boolean') return;
      const c = q.category || 'General';
      cats[c] = cats[c] || { correct: 0, total: 0 };
      cats[c].total += 1;
      if (q.isCorrect) cats[c].correct += 1;
    }));
    const categoryAccuracy = Object.entries(cats).map(([name, v]) => ({ name, accuracy: Math.round((v.correct / v.total) * 100) }));
    if (avgMock !== null) categoryAccuracy.push({ name: 'Mock Interview', accuracy: avgMock });

    res.json({
      range,
      kpis: {
        averageMockScore: avgMock,
        mockScoreDelta: avgMock !== null && prevMock !== null ? avgMock - prevMock : null,
        averageAptitudeScore: avgAptitude,
        aptitudeTests: aNow.length,
        interviewMinutes: Math.round(interviewSeconds / 60),
        mockRounds: iNow.length,
        percentile: mine ? percentileOf(mine.readiness, scores) : null,
        cohortSize: scores.length
      },
      timeline,
      categoryAccuracy
    });
  } catch (err) {
    console.error('Progress error:', err);
    res.status(500).json({ detail: 'Failed to load progress analytics' });
  }
});

// GET /me/gamification — badges are unlocked by real achievements; leaderboard is real students
router.get('/me/gamification', protect, async (req, res) => {
  try {
    const user = req.user;
    const userId = user._id;
    const [completedInterviews, bestAptitude, bestStar, bestAts, amazonOa, topStudents, allReadiness] = await Promise.all([
      InterviewSession.countDocuments({ userId, status: 'completed' }),
      AptitudeSession.findOne({ userId, status: 'completed' }).sort({ score: -1 }),
      InterviewSession.findOne({ userId, status: 'completed', 'scoreBreakdown.dimensions.star_compliance': { $gte: 85 } }),
      Resume.findOne({ userId }).sort({ atsScore: -1 }),
      AptitudeSession.findOne({ userId, status: 'completed', companyPattern: 'amazon', durationMinutes: { $gte: 90 }, score: { $gte: 60 } }),
      User.find({ role: 'student', isActive: true }).sort({ totalXp: -1, currentStreak: -1 }).limit(5),
      computeAllReadiness()
    ]);

    const badges = [
      { id: 'first-mock', title: 'First Voice Mock', desc: 'Complete your first mock interview.', icon: 'mic', unlocked: completedInterviews >= 1 },
      { id: 'streak-7', title: '7-Day Streak', desc: 'Practise on 7 consecutive days.', icon: 'flame', unlocked: (user.longestStreak || 0) >= 7 },
      { id: 'aptitude-ace', title: 'Aptitude Ace', desc: 'Score 90%+ in an aptitude test.', icon: 'zap', unlocked: Boolean(bestAptitude && bestAptitude.score >= 90) },
      { id: 'star-champion', title: 'STAR Champion', desc: 'Reach 85%+ STAR compliance in an interview.', icon: 'star', unlocked: Boolean(bestStar) },
      { id: 'ats-90', title: 'ATS 90+ Club', desc: 'Score 90+ on the resume ATS scan.', icon: 'file', unlocked: Boolean(bestAts && bestAts.atsScore >= 90) },
      { id: 'amazon-oa', title: 'Amazon OA Conqueror', desc: 'Score 60%+ in a 90-minute Amazon-pattern test.', icon: 'trophy', unlocked: Boolean(amazonOa) }
    ];

    // Anonymised cohort ranking (spec §18): peers' names and readiness scores are private;
    // only gamification data (XP, streak) is shown for them.
    const toRow = (u, rank) => {
      const isUser = u._id.toString() === userId.toString();
      return {
        rank,
        name: isUser ? u.fullName : `Anonymous Peer #${rank}`,
        college: isUser ? (u.collegeName || '') : '',
        score: isUser ? ((allReadiness.get(u._id.toString()) || {}).readiness || 0) : null,
        xp: u.totalXp || 0,
        streak: u.currentStreak || 0,
        isUser
      };
    };
    const leaderboard = topStudents.map((u, i) => toRow(u, i + 1));
    if (!leaderboard.some(r => r.isUser) && user.role === 'student') {
      const ahead = await User.countDocuments({ role: 'student', isActive: true, totalXp: { $gt: user.totalXp || 0 } });
      leaderboard.push(toRow(user, ahead + 1));
    }

    const lvl = getGamificationStats(user.totalXp || 0);
    res.json({
      level: lvl.level,
      levelTitle: lvl.levelTitle,
      levelProgress: lvl.progress,
      xpToNextLevel: lvl.xpNeeded,
      totalXp: user.totalXp || 0,
      currentStreak: user.currentStreak || 0,
      longestStreak: user.longestStreak || 0,
      badges,
      leaderboard,
      quests: todaysQuestState(user)
    });
  } catch (err) {
    console.error('Gamification error:', err);
    res.status(500).json({ detail: 'Failed to load gamification data' });
  }
});

// POST /me/resume
router.post('/me/resume', protect, upload.any(), handleResumeUpload);

// GET /me/resume
router.get('/me/resume', protect, async (req, res) => {
  try {
    const latest = await Resume.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
    // No resume yet is a normal state, not an error
    if (!latest) return res.status(204).end();

    if (latest.diagnosticData && typeof latest.diagnosticData === 'object') {
      return res.json({
        ...latest.diagnosticData,
        id: latest._id.toString(),
        _id: latest._id.toString(),
        created_at: latest.createdAt
      });
    }

    // Legacy record analysed before the current pipeline: return only what was stored
    res.json({
      id: latest._id.toString(),
      _id: latest._id.toString(),
      filename: latest.filename,
      parsedName: (latest.filename || 'resume').replace(/\.pdf$/i, ''),
      atsScore: latest.atsScore,
      overallScore: latest.atsScore,
      parsedSkills: latest.parsedSkills || [],
      detectedKeywords: latest.parsedSkills || [],
      missingKeywords: [],
      dimensions: [],
      hotspots: [],
      recommendations: ['This resume was analysed with an older version. Upload it again for the full analysis.'],
      legacy: true,
      created_at: latest.createdAt
    });
  } catch (err) {
    res.status(500).json({ detail: 'Failed to fetch candidate resume' });
  }
});

module.exports = router;

