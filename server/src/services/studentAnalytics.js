/**
 * Student analytics computed from real interview and aptitude sessions.
 * Shared by the student dashboard and the admin/TPO views.
 */
const AptitudeSession = require('../models/AptitudeSession');
const InterviewSession = require('../models/InterviewSession');
const TopicMastery = require('../models/TopicMastery');
const PlacementEvent = require('../models/PlacementEvent');
const { getActivePlan, serializePlan } = require('./studyPlanService');

const INTERVIEW_WEIGHT = 0.6;
const APTITUDE_WEIGHT = 0.4;

function toPercent(score) {
  if (score === null || score === undefined || Number.isNaN(Number(score))) return null;
  const n = Number(score);
  return Math.round(n > 0 && n <= 10 ? n * 10 : n);
}

function average(nums) {
  const valid = nums.filter(n => typeof n === 'number' && !Number.isNaN(n));
  return valid.length ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : null;
}

// Readiness blends interview and aptitude averages; with only one kind of data it uses that alone.
function blendReadiness(interviewAvg, aptitudeAvg) {
  if (interviewAvg === null && aptitudeAvg === null) return 0;
  if (interviewAvg === null) return aptitudeAvg;
  if (aptitudeAvg === null) return interviewAvg;
  return Math.round(interviewAvg * INTERVIEW_WEIGHT + aptitudeAvg * APTITUDE_WEIGHT);
}

function relativeDay(date) {
  if (!date) return 'Never';
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

function dateKey(date) {
  return new Date(date).toISOString().split('T')[0];
}

async function loadCompletedSessions(userId) {
  const [interviews, aptitudes] = await Promise.all([
    InterviewSession.find({ userId, status: 'completed' }).sort({ createdAt: 1 }),
    AptitudeSession.find({ userId, status: 'completed' }).sort({ createdAt: 1 })
  ]);
  return { interviews, aptitudes };
}

function computeReadinessFromSessions(interviews, aptitudes) {
  const interviewAvg = average(interviews.map(s => toPercent(s.overallScore)));
  const aptitudeAvg = average(aptitudes.map(s => s.score));
  return { score: blendReadiness(interviewAvg, aptitudeAvg), interviewAvg, aptitudeAvg };
}

// Readiness for every student, used for percentile ranks and admin cohort views.
async function computeAllReadiness() {
  const [interviewAgg, aptitudeAgg] = await Promise.all([
    InterviewSession.aggregate([
      { $match: { status: 'completed', overallScore: { $ne: null } } },
      { $project: { userId: 1, pct: { $cond: [{ $and: [{ $gt: ['$overallScore', 0] }, { $lte: ['$overallScore', 10] }] }, { $multiply: ['$overallScore', 10] }, '$overallScore'] } } },
      { $group: { _id: '$userId', avg: { $avg: '$pct' }, count: { $sum: 1 } } }
    ]),
    AptitudeSession.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: '$userId', avg: { $avg: '$score' }, count: { $sum: 1 } } }
    ])
  ]);

  const map = new Map();
  interviewAgg.forEach(r => map.set(String(r._id), { interviewAvg: Math.round(r.avg), interviewCount: r.count, aptitudeAvg: null, aptitudeCount: 0 }));
  aptitudeAgg.forEach(r => {
    const cur = map.get(String(r._id)) || { interviewAvg: null, interviewCount: 0 };
    map.set(String(r._id), { ...cur, aptitudeAvg: Math.round(r.avg), aptitudeCount: r.count });
  });
  map.forEach(v => { v.readiness = blendReadiness(v.interviewAvg, v.aptitudeAvg); });
  return map;
}

function percentileOf(score, allScores) {
  if (allScores.length <= 1) return allScores.length === 1 ? 100 : 0;
  const below = allScores.filter(s => s < score).length;
  return Math.round((below / (allScores.length - 1)) * 100);
}

function buildTimeline(interviews, aptitudes) {
  const days = new Map();
  interviews.forEach(s => {
    const k = dateKey(s.createdAt);
    const d = days.get(k) || { interview: [], aptitude: [] };
    d.interview.push(toPercent(s.overallScore));
    days.set(k, d);
  });
  aptitudes.forEach(s => {
    const k = dateKey(s.createdAt);
    const d = days.get(k) || { interview: [], aptitude: [] };
    d.aptitude.push(s.score);
    days.set(k, d);
  });
  return Array.from(days.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-10)
    .map(([date, d]) => ({
      date: new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      interviewScore: average(d.interview),
      aptitudeScore: average(d.aptitude)
    }));
}

function aptitudeCategoryStats(aptitudes) {
  const cats = {};
  aptitudes.forEach(s => {
    const seen = new Set();
    (s.questionsData || []).forEach(q => {
      if (typeof q.isCorrect !== 'boolean') return;
      const c = q.category || 'General';
      cats[c] = cats[c] || { correct: 0, total: 0, tests: 0, last: null, sub: q.subCategory };
      cats[c].total += 1;
      if (q.isCorrect) cats[c].correct += 1;
      if (!seen.has(c)) { cats[c].tests += 1; seen.add(c); }
      cats[c].last = s.createdAt;
    });
  });
  return Object.entries(cats).map(([category, v]) => ({
    category,
    accuracyPercentage: Math.round((v.correct / v.total) * 100),
    testsTaken: v.tests,
    lastPracticed: v.last
  }));
}

function statusFor(score) {
  if (score >= 75) return 'Strong';
  if (score >= 50) return 'Average';
  return 'Weak';
}

const TOPIC_CATEGORY = {
  'Behavioral & Communication': 'Behavioral',
  'Behavioral & Leadership': 'Behavioral',
  'System Design & Scalability': 'System Design'
};

function buildTopicHeatmap(masteries, aptitudeCats) {
  const fromInterviews = masteries.map(m => ({
    topic: m.topic,
    category: TOPIC_CATEGORY[m.topic] || 'Core CS',
    score: Math.round(m.masteryScore),
    status: statusFor(m.masteryScore),
    lastPracticed: relativeDay(m.lastAssessedAt)
  }));
  const fromAptitude = aptitudeCats.map(c => ({
    topic: c.category,
    category: 'Aptitude',
    score: c.accuracyPercentage,
    status: statusFor(c.accuracyPercentage),
    lastPracticed: relativeDay(c.lastPracticed)
  }));
  return [...fromInterviews, ...fromAptitude].sort((a, b) => a.score - b.score).slice(0, 8);
}

function companyKey(name) {
  return String(name || 'general').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function buildCompanyReadiness(interviews, aptitudes) {
  const companies = new Map();
  const add = (name, score, date) => {
    if (!name || score === null || score === undefined) return;
    const key = companyKey(name);
    const c = companies.get(key) || { name, scores: [] };
    c.scores.push({ score, date });
    companies.set(key, c);
  };
  interviews.forEach(s => add(s.companyTarget, toPercent(s.overallScore), s.createdAt));
  aptitudes.forEach(s => add(String(s.companyPattern || '').toUpperCase(), s.score, s.createdAt));

  return Array.from(companies.entries()).map(([key, c]) => {
    const scores = c.scores.sort((a, b) => new Date(a.date) - new Date(b.date)).map(x => x.score);
    const readiness = average(scores);
    const last = scores[scores.length - 1];
    const prevAvg = scores.length > 1 ? average(scores.slice(0, -1)) : last;
    return {
      companyId: key,
      companyName: c.name,
      readinessPercentage: readiness,
      practiceCount: scores.length,
      trend: last > prevAvg ? 'up' : last < prevAvg ? 'down' : 'stable',
      cutoffConfidence: scores.length >= 3 ? 'High' : scores.length === 2 ? 'Moderate' : 'Low'
    };
  }).sort((a, b) => b.practiceCount - a.practiceCount).slice(0, 6);
}

function buildStudyPlan(user, heatmap) {
  const today = dateKey(new Date());
  const weakest = heatmap.filter(t => t.status !== 'Strong').slice(0, 3);
  const source = weakest.length ? weakest : heatmap.slice(0, 3);
  const tasks = source.map((t, i) => ({
    id: `${today}-${companyKey(t.topic)}`,
    topic: t.topic,
    description: t.category === 'Aptitude'
      ? `Solve 10 ${t.topic} questions and review every wrong answer's solution.`
      : `Answer 2 mock-interview questions on ${t.topic} out loud and review the report feedback.`,
    durationMinutes: t.category === 'Aptitude' ? 15 : 25,
    priority: i === 0 ? 'High' : 'Normal'
  }));
  if (tasks.length === 0) {
    tasks.push(
      { id: `${today}-first-aptitude`, topic: 'Take your first aptitude test', description: 'Complete a 30-minute aptitude assessment to establish your baseline.', durationMinutes: 30, priority: 'High' },
      { id: `${today}-first-interview`, topic: 'Take your first mock interview', description: 'Answer at least 3 questions in a technical mock interview.', durationMinutes: 20, priority: 'Normal' },
      { id: `${today}-upload-resume`, topic: 'Upload your resume', description: 'Get your ATS score and interview hot-spots.', durationMinutes: 5, priority: 'Normal' }
    );
  }
  const done = new Set(user.completedStudyTasks || []);
  const todayTasks = tasks.map(t => ({ ...t, isCompleted: done.has(t.id) }));
  const completed = todayTasks.filter(t => t.isCompleted).length;
  return {
    todayTasks,
    totalProgressPercentage: Math.round((completed / todayTasks.length) * 100),
    daysAheadOrBehind: 0
  };
}

/** Active persisted study plan (from the latest report / generation); otherwise starter tasks. */
async function studyPlanForDashboard(user, heatmap) {
  const plan = await getActivePlan(user._id);
  if (plan && plan.items.length) {
    const serial = serializePlan(plan);
    const ordered = [...serial.items].sort((a, b) => Number(a.isCompleted) - Number(b.isCompleted));
    return {
      planId: serial.id,
      todayTasks: ordered.slice(0, 5).map(i => ({ id: i.id, topic: i.topic, description: i.description, durationMinutes: i.durationMinutes, isCompleted: i.isCompleted, priority: i.priority })),
      totalProgressPercentage: serial.progressPercentage,
      daysAheadOrBehind: 0
    };
  }
  return buildStudyPlan(user, heatmap);
}

async function nextDriveCountdown() {
  const next = await PlacementEvent.findOne({ date: { $gte: new Date() } }).sort({ date: 1 });
  if (!next) return { days: null, company: null };
  return {
    days: Math.max(0, Math.ceil((new Date(next.date) - Date.now()) / 86400000)),
    company: next.company || null
  };
}

function levelInfo(totalXp = 0) {
  const tiers = [
    { level: 1, title: 'Level 1: Novice Applicant', min: 0, max: 300 },
    { level: 2, title: 'Level 2: Aptitude Ace', min: 300, max: 700 },
    { level: 3, title: 'Level 3: Technical Contender', min: 700, max: 1200 },
    { level: 4, title: 'Level 4: Placement Ready', min: 1200, max: 2000 },
    { level: 5, title: 'Level 5: Elite Offer Holder', min: 2000, max: 3500 }
  ];
  const tier = [...tiers].reverse().find(t => totalXp >= t.min) || tiers[0];
  const next = tiers.find(t => t.level === tier.level + 1);
  return {
    level: tier.level,
    levelTitle: tier.title,
    progress: Math.min(100, Math.round(((totalXp - tier.min) / (tier.max - tier.min)) * 100)),
    xpToNextLevel: Math.max(0, tier.max - totalXp),
    nextMilestoneTitle: next ? next.title : tier.title
  };
}

async function buildDashboard(user) {
  const { interviews, aptitudes } = await loadCompletedSessions(user._id);
  const [masteries, allReadiness, countdown, recentInterviews, recentAptitudes] = await Promise.all([
    TopicMastery.find({ userId: user._id, source: 'interview' }),
    computeAllReadiness(),
    nextDriveCountdown(),
    InterviewSession.find({ userId: user._id }).sort({ createdAt: -1 }).limit(5),
    AptitudeSession.find({ userId: user._id }).sort({ createdAt: -1 }).limit(5)
  ]);

  const current = computeReadinessFromSessions(interviews, aptitudes);
  // Previous readiness = readiness before the most recent completed session
  const lastI = interviews[interviews.length - 1];
  const lastA = aptitudes[aptitudes.length - 1];
  const dropInterview = lastI && (!lastA || lastI.createdAt > lastA.createdAt);
  const previous = (interviews.length + aptitudes.length) > 1
    ? computeReadinessFromSessions(dropInterview ? interviews.slice(0, -1) : interviews, dropInterview ? aptitudes : aptitudes.slice(0, -1)).score
    : current.score;
  const delta = current.score - previous;

  const allScores = Array.from(allReadiness.values()).map(v => v.readiness);
  const hasActivity = interviews.length + aptitudes.length > 0;
  const aptitudeCats = aptitudeCategoryStats(aptitudes);
  const topicHeatmap = buildTopicHeatmap(masteries, aptitudeCats);
  const companyReadiness = buildCompanyReadiness(interviews, aptitudes);
  const lvl = levelInfo(user.totalXp || 0);
  const weakest = topicHeatmap[0];

  const recentSessions = [
    ...recentInterviews.map(s => ({
      id: s._id.toString(),
      date: dateKey(s.createdAt),
      title: `${s.companyTarget || 'General'} ${s.jobRole || ''} Mock Interview`.trim(),
      type: 'Interview',
      score: s.status === 'completed' ? (toPercent(s.overallScore) || 0) : 0,
      status: s.status === 'completed' ? 'Completed' : 'In Progress',
      createdAt: s.createdAt
    })),
    ...recentAptitudes.map(a => ({
      id: a._id.toString(),
      date: dateKey(a.createdAt),
      title: `${String(a.companyPattern || 'General').toUpperCase()} Aptitude ${a.mode === 'daily' ? 'Daily Quest' : 'Test'}`,
      type: 'Aptitude',
      score: a.status === 'completed' ? (a.score || 0) : 0,
      status: a.status === 'completed' ? 'Completed' : 'In Progress',
      createdAt: a.createdAt
    }))
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5)
    .map(({ createdAt, ...rest }) => rest);

  return {
    studentName: user.fullName || 'Candidate',
    targetRole: (user.targetRoles && user.targetRoles[0]) || 'Software Developer (SDE)',
    // The student's own dream company first, then the company they practise for most, then the next drive
    targetCompany: (user.targetCompanies && user.targetCompanies[0])
      || (companyReadiness[0] ? companyReadiness[0].companyName : (countdown.company || null)),
    placementCountdownDays: countdown.days,
    readiness: {
      score: current.score,
      previousScore: previous,
      delta,
      trend: delta > 0 ? 'up' : delta < 0 ? 'down' : 'neutral',
      percentileRank: hasActivity ? percentileOf(current.score, allScores) : 0,
      cohortSize: allScores.length,
      statusLabel: !hasActivity ? 'Not Started' : current.score >= 80 ? 'Interview Ready' : 'In Preparation'
    },
    scoreTimeline: buildTimeline(interviews, aptitudes),
    topicHeatmap,
    aptitudeCategoryAccuracy: aptitudeCats.map(({ lastPracticed, ...c }) => c),
    companyReadiness,
    studyPlan: await studyPlanForDashboard(user, topicHeatmap),
    gamification: {
      currentStreak: user.currentStreak || 0,
      longestStreak: user.longestStreak || 0,
      totalXp: user.totalXp || 0,
      level: lvl.level,
      levelTitle: lvl.levelTitle,
      levelProgress: lvl.progress,
      xpToNextLevel: lvl.xpToNextLevel,
      nextMilestoneTitle: lvl.nextMilestoneTitle
    },
    recentSessions,
    aiDailyDigest: hasActivity
      ? {
          headline: `Placement readiness is ${current.score}% across ${interviews.length} interview(s) and ${aptitudes.length} aptitude test(s).`,
          recommendedAction: weakest ? `Focus today on ${weakest.topic} (currently ${weakest.score}%).` : 'Keep practising to build topic-level insights.',
          weakestTopic: weakest ? weakest.topic : '',
          streakMotivation: `${user.currentStreak || 0}-day practice streak. Practise today to keep it going.`
        }
      : {
          headline: `Your readiness score appears after your first test or mock interview.`,
          recommendedAction: 'Start with a 30-minute aptitude test to establish your baseline.',
          weakestTopic: '',
          streakMotivation: 'Complete any practice session today to start your streak.'
        }
  };
}

function activityHeatmap(interviews, aptitudes, days = 30) {
  const counts = new Map();
  [...interviews, ...aptitudes].forEach(s => {
    const k = dateKey(s.createdAt);
    counts.set(k, (counts.get(k) || 0) + 1);
  });
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const k = dateKey(d);
    out.push({ date: k, count: counts.get(k) || 0 });
  }
  return out;
}

module.exports = {
  toPercent,
  average,
  blendReadiness,
  computeAllReadiness,
  loadCompletedSessions,
  computeReadinessFromSessions,
  buildCompanyReadiness,
  buildDashboard,
  activityHeatmap,
  levelInfo,
  percentileOf
};
