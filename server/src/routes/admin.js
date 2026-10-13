const express = require('express');
const multer = require('multer');
const PDFDocument = require('pdfkit');
const { protect, requireRoles } = require('../middleware/auth');
const User = require('../models/User');
const InterviewSession = require('../models/InterviewSession');
const AptitudeSession = require('../models/AptitudeSession');
const QuestionBank = require('../models/QuestionBank');
const Resume = require('../models/Resume');
const TopicMastery = require('../models/TopicMastery');
const PlacementEvent = require('../models/PlacementEvent');
const { computeAllReadiness, average } = require('../services/studentAnalytics');
const { notifyAllStudents } = require('../services/notificationService');
const AnswerEvaluation = require('../models/AnswerEvaluation');
const { getAiMetrics, audit } = require('../services/observability');

const router = express.Router();

const STAFF = ['admin', 'placement_officer', 'recruiter'];
const ADMIN_WRITE = ['admin', 'placement_officer'];
const READY_THRESHOLD = 70;
const ACTIVE_WINDOW_MS = 7 * 86400000;

router.use(protect, requireRoles(STAFF));

async function loadStudentRows(search = '') {
  const filter = { role: 'student' };
  const q = String(search || '').trim();
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ fullName: rx }, { email: rx }, { branch: rx }];
  }
  const [students, readiness, interviewCounts, aptitudeCounts] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }),
    computeAllReadiness(),
    InterviewSession.aggregate([
      { $match: { status: 'completed' } },
      { $sort: { updatedAt: -1 } },
      { $group: { _id: '$userId', n: { $sum: 1 }, last: { $max: '$updatedAt' }, latestId: { $first: '$_id' } } }
    ]),
    AptitudeSession.aggregate([{ $match: { status: 'completed' } }, { $group: { _id: '$userId', n: { $sum: 1 }, last: { $max: '$updatedAt' } } }])
  ]);
  const iMap = new Map(interviewCounts.map(r => [String(r._id), r]));
  const aMap = new Map(aptitudeCounts.map(r => [String(r._id), r]));

  return students.map(s => {
    const id = s._id.toString();
    const r = readiness.get(id);
    const interviews = iMap.get(id);
    const aptitudes = aMap.get(id);
    const lastPractice = [s.lastActive, interviews && interviews.last, aptitudes && aptitudes.last]
      .filter(Boolean).map(d => new Date(d).getTime());
    const lastActive = lastPractice.length ? new Date(Math.max(...lastPractice)) : null;
    const readinessScore = r ? r.readiness : 0;
    const practiced = Boolean(interviews || aptitudes);

    return {
      id,
      name: s.fullName || s.email.split('@')[0],
      email: s.email,
      department: s.branch || 'Not set',
      branch: s.branch || 'Not set',
      batchYear: s.graduationYear,
      batch: String(s.graduationYear || ''),
      targetRole: (s.targetRoles && s.targetRoles[0]) || 'Not set',
      lastActive: lastActive ? lastActive.toLocaleDateString('en-IN') : 'Never',
      lastActiveAt: lastActive,
      readinessScore,
      readiness: readinessScore,
      interviewsCompleted: interviews ? interviews.n : 0,
      latestInterviewId: interviews ? String(interviews.latestId) : null,
      aptitudeCompleted: aptitudes ? aptitudes.n : 0,
      streak: s.currentStreak || 0,
      currentStreak: s.currentStreak || 0,
      xp: s.totalXp || 0,
      totalXp: s.totalXp || 0,
      // Actual placement outcomes are not tracked in PrepAI, so status reflects practice progress only
      placementStatus: practiced ? 'In Process' : 'Not Started',
      status: practiced ? 'In Process' : 'Not Started'
    };
  });
}

// GET /students
router.get('/students', async (req, res) => {
  try {
    res.json(await loadStudentRows(req.query.search));
  } catch (err) {
    console.error('Admin students error:', err);
    res.status(500).json({ detail: 'Failed to fetch students list' });
  }
});

function severityFor(avg) {
  if (avg < 50) return 'Critical';
  if (avg < 70) return 'Warning';
  return 'Healthy';
}

async function computeWeakTopics(totalStudents) {
  const [mastery, aptitudeRows] = await Promise.all([
    // Interview mastery only — aptitude categories are counted from the sessions below, once
    TopicMastery.aggregate([
      { $match: { source: { $ne: 'aptitude' } } },
      { $group: { _id: '$topic', avg: { $avg: '$masteryScore' }, struggling: { $sum: { $cond: [{ $lt: ['$masteryScore', 60] }, 1, 0] } } } }
    ]),
    AptitudeSession.aggregate([
      { $match: { status: 'completed' } },
      { $unwind: '$questionsData' },
      { $match: { 'questionsData.isCorrect': { $in: [true, false] } } },
      { $group: {
        _id: { cat: '$questionsData.category', user: '$userId' },
        correct: { $sum: { $cond: ['$questionsData.isCorrect', 1, 0] } },
        total: { $sum: 1 }
      } },
      { $project: { pct: { $multiply: [{ $divide: ['$correct', '$total'] }, 100] } } },
      { $group: { _id: '$_id.cat', avg: { $avg: '$pct' }, struggling: { $sum: { $cond: [{ $lt: ['$pct', 60] }, 1, 0] } } } }
    ])
  ]);
  const denom = totalStudents || 1;
  const rows = [
    ...mastery.map(m => ({ topic: m._id, category: 'Interview Topic', avg: m.avg, struggling: m.struggling })),
    ...aptitudeRows.map(a => ({ topic: a._id || 'General', category: 'Aptitude', avg: a.avg, struggling: a.struggling }))
  ];
  return rows
    .map(r => ({
      topic: r.topic,
      category: r.category,
      averageScore: Math.round(r.avg),
      strugglingStudentsCount: r.struggling,
      percentageStruggling: Math.round((r.struggling / denom) * 100),
      severity: severityFor(r.avg)
    }))
    .sort((a, b) => a.averageScore - b.averageScore)
    .slice(0, 8);
}

async function computeCompanyReadiness(readinessMap) {
  const [interviewByCompany, upcoming] = await Promise.all([
    InterviewSession.aggregate([
      { $match: { status: 'completed', overallScore: { $ne: null } } },
      { $project: { company: '$companyTarget', userId: 1, createdAt: 1,
        pct: { $cond: [{ $and: [{ $gt: ['$overallScore', 0] }, { $lte: ['$overallScore', 10] }] }, { $multiply: ['$overallScore', 10] }, '$overallScore'] } } },
      { $sort: { createdAt: 1 } },
      { $group: { _id: '$company', avg: { $avg: '$pct' }, users: { $addToSet: '$userId' }, scores: { $push: '$pct' } } }
    ]),
    PlacementEvent.find({ date: { $gte: new Date() } }).sort({ date: 1 })
  ]);
  const visitMap = new Map(upcoming.map(e => [String(e.company).toLowerCase(), e.date]));

  return interviewByCompany.filter(c => c._id).map(c => {
    const users = c.users.map(String);
    const ready = users.filter(u => (readinessMap.get(u) || {}).readiness >= READY_THRESHOLD).length;
    const half = Math.floor(c.scores.length / 2);
    const firstHalf = average(c.scores.slice(0, half));
    const secondHalf = average(c.scores.slice(half));
    const visit = visitMap.get(String(c._id).toLowerCase());
    return {
      companyId: String(c._id).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      companyName: c._id,
      visitingDate: visit ? new Date(visit).toISOString().split('T')[0] : undefined,
      eligibleStudentsCount: users.length,
      interviewReadyCount: ready,
      readinessPercentage: users.length ? Math.round((ready / users.length) * 100) : 0,
      averageMockScore: Math.round(c.avg),
      trend: firstHalf === null || secondHalf === null || half === 0 ? 'stable'
        : secondHalf > firstHalf ? 'improving' : secondHalf < firstHalf ? 'declining' : 'stable'
    };
  }).sort((a, b) => b.eligibleStudentsCount - a.eligibleStudentsCount);
}

const getAnalyticsData = async (req, res) => {
  try {
    const now = Date.now();
    const [totalStudents, readinessMap, students, totalInterviews, interviewAvgAgg, aptitudeAvgAgg, drivesScheduled] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      computeAllReadiness(),
      User.find({ role: 'student' }, { _id: 1, branch: 1, lastActive: 1 }),
      InterviewSession.countDocuments({ status: 'completed' }),
      InterviewSession.aggregate([
        { $match: { status: 'completed', overallScore: { $ne: null } } },
        { $group: { _id: null, avg: { $avg: { $cond: [{ $and: [{ $gt: ['$overallScore', 0] }, { $lte: ['$overallScore', 10] }] }, { $multiply: ['$overallScore', 10] }, '$overallScore'] } } } }
      ]),
      AptitudeSession.aggregate([{ $match: { status: 'completed' } }, { $group: { _id: null, avg: { $avg: '$score' } } }]),
      PlacementEvent.countDocuments({ date: { $gte: new Date() } })
    ]);

    const studentIds = new Set(students.map(s => s._id.toString()));
    const recentPracticeUsers = new Set([
      ...(await InterviewSession.distinct('userId', { updatedAt: { $gte: new Date(now - ACTIVE_WINDOW_MS) } })).map(String),
      ...(await AptitudeSession.distinct('userId', { updatedAt: { $gte: new Date(now - ACTIVE_WINDOW_MS) } })).map(String)
    ]);
    const activeThisWeek = students.filter(s =>
      recentPracticeUsers.has(s._id.toString()) || (s.lastActive && now - new Date(s.lastActive).getTime() < ACTIVE_WINDOW_MS)
    ).length;

    const studentReadiness = Array.from(readinessMap.entries())
      .filter(([id]) => studentIds.has(id))
      .map(([, v]) => v.readiness);
    const readyCount = studentReadiness.filter(r => r >= READY_THRESHOLD).length;

    const bins = [[0, 20], [21, 40], [41, 60], [61, 80], [81, 100]];
    const scoreDistribution = bins.map(([lo, hi]) => {
      const count = studentReadiness.filter(r => r >= lo && r <= hi).length;
      return { scoreRange: `${lo}-${hi}`, range: `${lo}-${hi}`, studentCount: count, count };
    });

    const deptMap = new Map();
    students.forEach(s => {
      const dept = s.branch || 'Unspecified';
      const d = deptMap.get(dept) || { name: dept, students: 0, scores: [] };
      d.students += 1;
      const r = readinessMap.get(s._id.toString());
      if (r) d.scores.push(r.readiness);
      deptMap.set(dept, d);
    });
    const departmentPerformance = Array.from(deptMap.values())
      .map(d => ({ name: d.name, students: d.students, score: average(d.scores) || 0 }))
      .sort((a, b) => b.students - a.students);

    const averageInterviewScore = interviewAvgAgg[0] ? Math.round(interviewAvgAgg[0].avg) : 0;
    const averageAptitudeScore = aptitudeAvgAgg[0] ? Math.round(aptitudeAvgAgg[0].avg) : 0;
    const placementReadinessRate = totalStudents ? Math.round((readyCount / totalStudents) * 100) : 0;

    const metrics = {
      totalRegistered: totalStudents,
      total_students: totalStudents,
      activeThisWeek,
      active_students: activeThisWeek,
      engagementRate: totalStudents ? Math.round((activeThisWeek / totalStudents) * 100) : 0,
      total_interviews_given: totalInterviews,
      averageInterviewScore,
      averageMockScore: averageInterviewScore,
      averageAptitudeScore,
      readyForPlacement: readyCount,
      placementReadinessRate,
      drivesScheduled
    };

    const [weakTopics, companyReadiness] = await Promise.all([
      computeWeakTopics(totalStudents),
      computeCompanyReadiness(readinessMap)
    ]);

    res.json({
      overview: metrics,
      metrics,
      department_performance: departmentPerformance,
      departmentPerformance,
      score_distribution: scoreDistribution,
      scoreDistribution,
      recruiter_cutoffs: companyReadiness,
      recruiterCutoffs: companyReadiness,
      companyReadiness,
      weakTopics
    });
  } catch (err) {
    console.error('Admin analytics error:', err);
    res.status(500).json({ detail: 'Failed to fetch analytics' });
  }
};

// GET /analytics and GET /batches/analytics
router.get('/analytics', getAnalyticsData);
router.get('/batches/analytics', getAnalyticsData);

// GET /batches — cohorts grouped by graduation year
router.get('/batches', async (req, res) => {
  try {
    const readinessMap = await computeAllReadiness();
    const students = await User.find({ role: 'student' }, { _id: 1, graduationYear: 1 });
    const byYear = new Map();
    students.forEach(s => {
      const y = s.graduationYear || 'Unknown';
      const b = byYear.get(y) || { total: 0, ready: 0 };
      b.total += 1;
      if ((readinessMap.get(s._id.toString()) || {}).readiness >= READY_THRESHOLD) b.ready += 1;
      byYear.set(y, b);
    });
    res.json(Array.from(byYear.entries()).map(([year, b]) => ({
      id: `batch-${year}`,
      name: `${year} Batch`,
      graduationYear: year,
      totalStudents: b.total,
      readyCount: b.ready
    })));
  } catch (err) {
    res.status(500).json({ detail: 'Failed to fetch batches' });
  }
});

// POST /batches/drive-mode (+ legacy aliases) — activates a company drive
router.post(['/batches/drive-mode', '/batches/:id/drive-mode', '/drive-mode', '/drives/activate', '/company-drives'], requireRoles(ADMIN_WRITE), async (req, res) => {
  try {
    const company = String(req.body.companyName || req.body.company || '').trim();
    if (!company) {
      return res.status(400).json({ detail: 'companyName is required' });
    }
    const durationDays = Math.min(90, Math.max(1, Number(req.body.durationDays) || 7));
    const startDate = new Date();
    const drive = await PlacementEvent.create({
      kind: 'drive',
      title: `${company} Campus Drive`,
      company,
      batch: req.body.targetBatch || 'All Batches',
      date: new Date(startDate.getTime() + durationDays * 86400000),
      durationDays,
      mandatoryMockRounds: Math.max(0, Number(req.body.mandatoryMockRounds) || 0),
      createdBy: req.user._id
    });
    const notified = await notifyAllStudents({
      type: 'company_drive',
      title: `${company} Drive Mode Activated`,
      message: `The placement office activated ${company} drive mode for ${drive.batch}. ${drive.mandatoryMockRounds ? `${drive.mandatoryMockRounds} mandatory mock round(s) required. ` : ''}Drive closes in ${durationDays} day(s).`,
      actionUrl: '/aptitude',
      severity: 'info'
    });
    await audit(req, 'admin.company_drive_activated', { targetType: 'placement_event', targetId: drive._id, details: { company, durationDays, notified } });
    res.status(201).json({
      status: 'success',
      message: `Drive mode activated for ${company}. ${notified} student(s) notified.`,
      drive: drive.toJSON()
    });
  } catch (err) {
    console.error('Drive activation error:', err);
    res.status(500).json({ detail: 'Failed to activate drive mode' });
  }
});

// --- Question upload (CSV, 9-column PrepAI schema) ---
const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 }
});

// RFC 4180-style CSV parser (quoted fields, escaped quotes, CRLF)
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some(c => c.trim() !== '')) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some(c => c.trim() !== '')) rows.push(row);
  return rows;
}

const REQUIRED_COLUMNS = ['category', 'sub_category', 'job_role', 'company_tags', 'difficulty', 'question_text', 'options', 'correct_answer', 'explanation'];

// Options are "A:text|B:text|C:text|D:text"; correct_answer is a letter or the option text.
function parseQuestionRow(cells, header) {
  const get = name => String(cells[header.indexOf(name)] || '').trim();
  const questionText = get('question_text');
  if (!questionText) throw new Error('Missing question_text');
  const options = get('options').split('|').map(o => o.replace(/^[A-D]\s*[:.)]\s*/i, '').trim()).filter(Boolean);
  if (options.length < 2 || options.length > 4) throw new Error('options must contain 2-4 values separated by |');
  const answerRaw = get('correct_answer');
  if (!answerRaw) throw new Error('Missing correct_answer');
  const letterIdx = ['A', 'B', 'C', 'D'].indexOf(answerRaw.toUpperCase());
  const correctAnswer = letterIdx >= 0 ? options[letterIdx] : options.find(o => o.toLowerCase() === answerRaw.toLowerCase());
  if (!correctAnswer) throw new Error('correct_answer does not match any option');
  const difficulty = get('difficulty').toLowerCase() || 'medium';
  if (!['easy', 'medium', 'hard'].includes(difficulty)) throw new Error('difficulty must be Easy, Medium or Hard');
  const category = get('category');
  if (!category) throw new Error('Missing category');
  return {
    category,
    subCategory: get('sub_category') || 'General',
    jobRole: get('job_role') || 'Software Developer (SDE)',
    companyTags: get('company_tags').split(',').map(t => t.trim().toLowerCase()).filter(Boolean),
    difficulty,
    questionText,
    options,
    correctAnswer,
    explanation: get('explanation')
  };
}

router.post(['/questions/upload', '/questions/import'], requireRoles(ADMIN_WRITE), (req, res, next) => {
  csvUpload.any()(req, res, err => {
    if (err) {
      return res.status(400).json({ detail: err.code === 'LIMIT_FILE_SIZE' ? 'CSV must be 2 MB or smaller' : 'Upload exactly one CSV file' });
    }
    next();
  });
}, async (req, res) => {
  try {
    const file = req.files && req.files[0];
    if (!file) {
      return res.status(400).json({ detail: 'Attach a CSV file' });
    }
    const rows = parseCsv(file.buffer.toString('utf8').replace(/^﻿/, ''));
    if (rows.length < 2) {
      return res.status(400).json({ detail: 'CSV has no data rows' });
    }
    const header = rows[0].map(h => h.trim().toLowerCase());
    const missing = REQUIRED_COLUMNS.filter(c => !header.includes(c));
    if (missing.length) {
      return res.status(400).json({ detail: `Missing column(s): ${missing.join(', ')}` });
    }

    const errors = [];
    const docs = [];
    const seenTexts = new Set();
    for (let i = 1; i < rows.length; i++) {
      try {
        const doc = parseQuestionRow(rows[i], header);
        const key = doc.questionText.toLowerCase();
        if (seenTexts.has(key)) throw new Error('Duplicate question_text within the file');
        seenTexts.add(key);
        docs.push({ rowNumber: i + 1, doc });
      } catch (e) {
        errors.push({ row: i + 1, reason: e.message });
      }
    }

    // Skip questions already in the bank
    const existing = await QuestionBank.find({ questionText: { $in: docs.map(d => d.doc.questionText) } }, { questionText: 1 });
    const existingSet = new Set(existing.map(e => e.questionText.toLowerCase()));
    const toInsert = [];
    docs.forEach(d => {
      if (existingSet.has(d.doc.questionText.toLowerCase())) errors.push({ row: d.rowNumber, reason: 'Duplicate question_text in database' });
      else toInsert.push(d.doc);
    });
    if (toInsert.length) await QuestionBank.insertMany(toInsert.map(d => ({ ...d, source: 'admin_upload', version: 1 })));
    await audit(req, 'admin.questions_imported', { details: { totalRows: rows.length - 1, accepted: toInsert.length, rejected: errors.length } });

    errors.sort((a, b) => a.row - b.row);
    res.json({
      totalRows: rows.length - 1,
      acceptedRows: toInsert.length,
      rejectedRows: errors.length,
      errors
    });
  } catch (err) {
    console.error('Question upload error:', err);
    res.status(500).json({ detail: 'Failed to process question CSV' });
  }
});

// --- Interview events ---
function toEventPayload(e) {
  return {
    id: e._id.toString(),
    eventName: e.title,
    scheduledDate: new Date(e.date).toISOString().split('T')[0],
    scheduledTime: e.time,
    roleTitle: e.roleTitle || '',
    companyName: e.company,
    batchName: e.batch,
    participatingStudentsLimit: e.targetCount || undefined,
    kind: e.kind
  };
}

// GET /events
router.get('/events', async (req, res) => {
  try {
    const events = await PlacementEvent.find({ kind: 'event' }).sort({ date: 1 });
    res.json(events.map(toEventPayload));
  } catch (err) {
    res.status(500).json({ detail: 'Failed to fetch events' });
  }
});

// POST /events
router.post('/events', requireRoles(ADMIN_WRITE), async (req, res) => {
  try {
    const title = String(req.body.eventName || req.body.title || '').trim();
    const date = new Date(req.body.scheduledDate || req.body.date);
    if (!title) return res.status(400).json({ detail: 'eventName is required' });
    if (Number.isNaN(date.getTime())) return res.status(400).json({ detail: 'scheduledDate must be a valid date' });

    const event = await PlacementEvent.create({
      kind: 'event',
      title,
      company: req.body.companyName || req.body.company || '',
      roleTitle: req.body.roleTitle || '',
      batch: req.body.batchName || req.body.batch || 'All Batches',
      date,
      time: req.body.scheduledTime || req.body.time || '',
      targetCount: Number(req.body.participatingStudentsLimit) || 0,
      createdBy: req.user._id
    });
    await notifyAllStudents({
      type: 'event_scheduled',
      title: `New mock event: ${title}`,
      message: `${event.company ? event.company + ': ' : ''}${date.toDateString()} ${event.time}`.trim(),
      actionUrl: '/interview',
      severity: 'info'
    });
    await audit(req, 'admin.event_scheduled', { targetType: 'placement_event', targetId: event._id, details: { title } });
    res.status(201).json({ status: 'success', message: 'Placement drive event scheduled successfully', event: toEventPayload(event) });
  } catch (err) {
    console.error('Create event error:', err);
    res.status(500).json({ detail: 'Failed to schedule event' });
  }
});

// --- Report export (CSV or PDF) ---
function csvCell(v) {
  const s = v === null || v === undefined ? '' : String(v);
  // Prefix cells that spreadsheet apps would evaluate as formulas
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

async function buildExportTable(type, batchFilter) {
  if (type === 'weak-topics') {
    const total = await User.countDocuments({ role: 'student' });
    const rows = await computeWeakTopics(total);
    return {
      title: 'Curriculum Weak Topic Matrix',
      columns: ['Topic', 'Category', 'Average Score', 'Struggling Students', '% Struggling', 'Severity'],
      rows: rows.map(r => [r.topic, r.category, r.averageScore, r.strugglingStudentsCount, r.percentageStruggling, r.severity])
    };
  }
  if (type === 'company-readiness') {
    const rows = await computeCompanyReadiness(await computeAllReadiness());
    return {
      title: 'Company Readiness',
      columns: ['Company', 'Students Practiced', 'Interview Ready', 'Readiness %', 'Avg Mock Score', 'Trend', 'Visiting Date'],
      rows: rows.map(r => [r.companyName, r.eligibleStudentsCount, r.interviewReadyCount, r.readinessPercentage, r.averageMockScore, r.trend, r.visitingDate || ''])
    };
  }
  if (type === 'ats-audit') {
    const resumes = await Resume.aggregate([
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$userId', atsScore: { $first: '$atsScore' }, filename: { $first: '$filename' }, uploadedAt: { $first: '$createdAt' } } }
    ]);
    const users = await User.find({ _id: { $in: resumes.map(r => r._id) } });
    const uMap = new Map(users.map(u => [u._id.toString(), u]));
    return {
      title: 'Resume ATS Audit',
      columns: ['Name', 'Email', 'Branch', 'Latest ATS Score', 'File', 'Uploaded'],
      rows: resumes.filter(r => uMap.has(String(r._id))).map(r => {
        const u = uMap.get(String(r._id));
        return [u.fullName, u.email, u.branch, r.atsScore, r.filename, new Date(r.uploadedAt).toLocaleDateString('en-IN')];
      })
    };
  }
  let students = await loadStudentRows();
  if (batchFilter) {
    const year = (String(batchFilter).match(/\d{4}/) || [])[0];
    if (year) students = students.filter(s => String(s.batchYear) === year);
  }
  return {
    title: 'Batch Roster with Readiness',
    columns: ['Name', 'Email', 'Branch', 'Batch', 'Readiness', 'Interviews', 'Aptitude Tests', 'Streak', 'XP', 'Last Active'],
    rows: students.map(s => [s.name, s.email, s.department, s.batchYear, s.readinessScore, s.interviewsCompleted, s.aptitudeCompleted, s.streak, s.xp, s.lastActive])
  };
}

// GET /reports/export?type=full-batch|weak-topics|company-readiness|ats-audit&format=csv|pdf&batch=
router.get('/reports/export', async (req, res) => {
  try {
    const type = String(req.query.type || 'full-batch');
    const format = req.query.format === 'pdf' ? 'pdf' : 'csv';
    const table = await buildExportTable(type, req.query.batch);
    await audit(req, 'admin.report_exported', { details: { type, format, rows: table.rows.length } });
    const stamp = new Date().toISOString().split('T')[0];
    const baseName = `prepai_${type}_${stamp}`;

    if (format === 'csv') {
      const csv = [table.columns, ...table.rows].map(r => r.map(csvCell).join(',')).join('\r\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${baseName}.csv"`);
      return res.send('﻿' + csv);
    }

    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${baseName}.pdf"`);
    doc.pipe(res);
    doc.fontSize(16).fillColor('#1e3a8a').text(`PrepAI: ${table.title}`);
    doc.fontSize(9).fillColor('#64748b').text(`Generated ${new Date().toLocaleString('en-IN')} • ${table.rows.length} row(s)`);
    doc.moveDown(1);
    doc.fontSize(9).fillColor('#0f172a').text(table.columns.join('  |  '));
    doc.moveDown(0.3);
    table.rows.forEach(r => doc.fillColor('#334155').text(r.map(c => (c === null || c === undefined ? '' : String(c))).join('  |  ')));
    if (table.rows.length === 0) doc.fillColor('#94a3b8').text('No data available yet.');
    doc.end();
  } catch (err) {
    console.error('Report export error:', err);
    if (!res.headersSent) res.status(500).json({ detail: 'Failed to export report' });
  }
});

// GET /ai-quality — evaluation quality & model observability for the TPO/admin (spec §17, §26)
router.get('/ai-quality', async (req, res) => {
  try {
    const since = new Date(Date.now() - 30 * 86400000);
    const evals = await AnswerEvaluation.find({ createdAt: { $gte: since } }, { status: 1, overall: 1, conflict: 1, reviewRequired: 1, confidence: 1, signalsAvailable: 1, classification: 1, model: 1 }).lean();
    const completed = evals.filter(e => e.status === 'completed');
    const bins = [0, 20, 40, 60, 80, 101];
    res.json({
      windowDays: 30,
      evaluations: evals.length,
      completed: completed.length,
      failedRate: evals.length ? Number((evals.filter(e => e.status === 'failed').length / evals.length).toFixed(3)) : 0,
      conflictRate: completed.length ? Number((completed.filter(e => e.conflict).length / completed.length).toFixed(3)) : 0,
      reviewRequiredRate: completed.length ? Number((completed.filter(e => e.reviewRequired).length / completed.length).toFixed(3)) : 0,
      layaSignalAvailability: evals.length ? Number((evals.filter(e => e.signalsAvailable && e.signalsAvailable.laya).length / evals.length).toFixed(3)) : 0,
      scoreDistribution: bins.slice(0, -1).map((lo, i) => ({ range: `${lo}-${bins[i + 1] - 1}`, count: completed.filter(e => e.overall >= lo && e.overall < bins[i + 1]).length })),
      classificationCounts: completed.reduce((acc, e) => { acc[e.classification] = (acc[e.classification] || 0) + 1; return acc; }, {}),
      models: Array.from(new Set(completed.map(e => e.model).filter(Boolean))),
      aiMetrics: await getAiMetrics({ sinceHours: 24 * 30 })
    });
  } catch (err) {
    console.error('AI quality error:', err);
    res.status(500).json({ detail: 'Failed to load AI quality metrics' });
  }
});

// POST /announcements
router.post('/announcements', requireRoles(ADMIN_WRITE), async (req, res) => {
  try {
    const title = String(req.body.title || '').trim();
    if (!title) return res.status(400).json({ detail: 'title is required' });
    const notified = await notifyAllStudents({
      type: 'system',
      title,
      message: String(req.body.message || ''),
      severity: req.body.priority === 'high' ? 'warning' : 'info'
    });
    await audit(req, 'admin.announcement_sent', { details: { title, notified } });
    res.json({ status: 'success', message: `Announcement sent to ${notified} student(s).` });
  } catch (err) {
    res.status(500).json({ detail: 'Failed to send announcement' });
  }
});

module.exports = router;
