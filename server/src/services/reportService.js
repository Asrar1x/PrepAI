/**
 * Interview report generation (spec §15). Runs as a background job after the interview ends:
 * finishes any pending answer evaluations, aggregates real scores, records mastery changes and
 * the recommended next difficulty, builds a study plan, and persists the report.
 */
const config = require('../config/env');
const InterviewSession = require('../models/InterviewSession');
const InterviewTurn = require('../models/InterviewTurn');
const AnswerEvaluation = require('../models/AnswerEvaluation');
const InterviewReport = require('../models/InterviewReport');
const User = require('../models/User');
const { providerFactory } = require('./providers/AIProviderFactory');
const { renderPrompt } = require('../prompts');
const { parseModelJson } = require('./jsonOutput');
const { evaluateTurn, ensureTurnsFromTranscript } = require('./interviewService');
const { getTopicDifficulty } = require('./adaptiveEngine');
const { createPlan, serializePlan } = require('./studyPlanService');
const { notifyUser } = require('./notificationService');
const jobQueue = require('./jobQueue');
const interviewMemory = require('./interviewMemory');
const vision = require('./visionService');
const InterviewFrame = require('../models/InterviewFrame');

const DIMENSION_META = [
  { key: 'correctness', name: 'Correctness', description: 'Technical and conceptual correctness, supported by evidence from your answers.' },
  { key: 'relevance', name: 'Relevance', description: 'How directly your answers addressed the questions asked.' },
  { key: 'technicalDepth', name: 'Technical Depth', description: 'Mechanisms, trade-offs and implementation detail appropriate to the level.' },
  { key: 'completeness', name: 'Completeness', description: 'Coverage of the reference concepts for each question.' },
  { key: 'reasoning', name: 'Reasoning', description: 'Quality of explanation, logic and justification.' },
  { key: 'clarity', name: 'Clarity', description: 'Organisation and comprehensibility of your answers.' },
  { key: 'communication', name: 'Communication', description: 'Concise, coherent, interview-appropriate delivery.' }
];

const TOPIC_RESOURCES = {
  'Data Structures & Algorithms': { title: 'NeetCode Roadmap', type: 'Article', description: 'Structured DSA practice by pattern.', externalLink: 'https://neetcode.io/roadmap' },
  'Database Systems & SQL': { title: 'Use The Index, Luke', type: 'Article', description: 'How SQL indexes and query plans work.', externalLink: 'https://use-the-index-luke.com/' },
  'Operating Systems & Networking': { title: 'Operating Systems: Three Easy Pieces', type: 'Article', description: 'Free OS textbook: processes, memory, concurrency.', externalLink: 'https://pages.cs.wisc.edu/~remzi/OSTEP/' },
  'Object-Oriented Programming': { title: 'Refactoring Guru: Design Patterns', type: 'Article', description: 'OOP principles and design patterns with examples.', externalLink: 'https://refactoring.guru/design-patterns' },
  'System Design & Scalability': { title: 'System Design Primer', type: 'Article', description: 'Scalability, caching, load balancing and trade-offs.', externalLink: 'https://github.com/donnemartin/system-design-primer' },
  'Concurrency & Multithreading': { title: 'OSTEP: Concurrency', type: 'Article', description: 'Threads, locks, condition variables and common bugs.', externalLink: 'https://pages.cs.wisc.edu/~remzi/OSTEP/#book-chapters' },
  'Behavioral & Communication': { title: 'Tech Interview Handbook: Behavioral', type: 'Article', description: 'Structuring answers with the STAR framework.', externalLink: 'https://www.techinterviewhandbook.org/behavioral-interview/' },
  'Projects & Resume': { title: 'Tech Interview Handbook: Resume', type: 'Article', description: 'Presenting projects with measurable outcomes.', externalLink: 'https://www.techinterviewhandbook.org/resume/' }
};

function mean(values) {
  const v = values.filter(x => typeof x === 'number' && Number.isFinite(x));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

function grade(score) {
  if (score === null) return 'C';
  return score >= 90 ? 'A+' : score >= 75 ? 'A' : score >= 60 ? 'B' : 'C';
}

function durationOf(session) {
  if (session.durationSeconds) return session.durationSeconds;
  const start = session.startedAt || session.createdAt;
  const end = session.endedAt || new Date();
  return Math.max(0, Math.round((new Date(end) - new Date(start)) / 1000));
}

function communicationStats(turns, session) {
  const answered = turns.filter(t => t.answer);
  const words = answered.reduce((n, t) => n + (t.speech?.wordCount || t.answer.split(/\s+/).filter(Boolean).length), 0);
  const aiWords = turns.reduce((n, t) => n + t.question.split(/\s+/).filter(Boolean).length, 0);
  const fillers = answered.reduce((n, t) => n + (t.speech?.fillerWordCount || 0), 0);
  const latencies = answered.map(t => t.speech?.responseLatencyMs).filter(v => typeof v === 'number');
  const voiceTurns = answered.filter(t => t.speech?.inputMode === 'voice' && typeof t.speech.speakingDurationMs === 'number' && t.speech.speakingDurationMs > 0);
  const speakingMs = voiceTurns.reduce((n, t) => n + t.speech.speakingDurationMs, 0);
  const voiceWords = voiceTurns.reduce((n, t) => n + (t.speech.wordCount || 0), 0);
  return {
    answerCount: answered.length,
    totalWordCount: words,
    fillerWordCount: fillers,
    fillerWordsDetected: fillers ? [`${fillers} filler word(s) across ${answered.length} answer(s)`] : [],
    fillerRatePer100Words: words ? Number(((fillers / words) * 100).toFixed(1)) : 0,
    averageResponseTimeSeconds: latencies.length ? Number((mean(latencies) / 1000).toFixed(1)) : 0,
    longestAnswerSeconds: voiceTurns.length ? Math.round(Math.max(...voiceTurns.map(t => t.speech.speakingDurationMs)) / 1000) : 0,
    paceWordsPerMinute: speakingMs > 0 ? Math.round(voiceWords / (speakingMs / 60000)) : null,
    talkTimeRatioPercentage: words + aiWords ? Math.round((words / (words + aiWords)) * 100) : 0,
    interruptionCount: answered.reduce((n, t) => n + (t.speech?.interruptionCount || 0), 0),
    voiceAnswers: voiceTurns.length,
    durationSeconds: durationOf(session)
  };
}

function communicationObservations(stats) {
  const obs = [];
  if (!stats.answerCount) return obs;
  obs.push(`You gave ${stats.answerCount} answer(s) totalling ${stats.totalWordCount} words.`);
  if (stats.fillerWordCount) obs.push(`Filler words appeared ${stats.fillerWordCount} time(s) (${stats.fillerRatePer100Words} per 100 words).`);
  if (stats.averageResponseTimeSeconds) obs.push(`Average time from question to answer: ${stats.averageResponseTimeSeconds}s.`);
  if (stats.paceWordsPerMinute) obs.push(`Speaking pace in voice answers: ${stats.paceWordsPerMinute} words per minute.`);
  if (stats.interruptionCount) obs.push(`You started speaking over the interviewer ${stats.interruptionCount} time(s); this is recorded, not penalised.`);
  return obs;
}

// Placement-ready threshold (same as the admin "ready for placement" cut-off)
const TARGET_SCORE = 70;

/**
 * How far the student is from the target and what closes the gap fastest — computed from this
 * interview's evaluations and the student's earlier interviews (interview memory).
 */
function buildImprovementAnalysis({ overall, dimensions, weakTopics, rows, history }) {
  const gap = Math.max(0, TARGET_SCORE - overall);
  const dimensionGaps = dimensions
    .map(d => {
      const weight = config.evaluation.weights[d.key];
      const dGap = Math.max(0, TARGET_SCORE - d.score);
      return { name: d.name, key: d.key, score: d.score, target: TARGET_SCORE, gap: dGap, weightPercentage: Math.round(weight * 100), pointsGain: Number((weight * dGap).toFixed(1)) };
    })
    .filter(d => d.gap > 0)
    .sort((a, b) => b.pointsGain - a.pointsGain);

  // Fewest dimensions whose improvement to the target closes the overall gap
  const fastestPath = [];
  let covered = 0;
  for (const d of dimensionGaps) {
    if (covered >= gap) break;
    fastestPath.push(d.name);
    covered += d.pointsGain;
  }

  const missedNow = new Map();
  rows.forEach(r => r.missingConcepts.forEach(c => {
    const key = c.toLowerCase();
    const e = missedNow.get(key) || { concept: c, count: 0, topics: new Set() };
    e.count += 1;
    e.topics.add(r.topic);
    missedNow.set(key, e);
  }));
  const pastMissed = new Set((history ? history.missedConcepts : []).map(c => c.toLowerCase()));
  const conceptsToLearn = [...missedNow.values()]
    .map(e => ({ concept: e.concept, timesMissed: e.count, topics: [...e.topics], missedBefore: pastMissed.has(e.concept.toLowerCase()) }))
    .sort((a, b) => Number(b.missedBefore) - Number(a.missedBefore) || b.timesMissed - a.timesMissed)
    .slice(0, 8);

  const historyTopics = new Map((history ? history.topics : []).map(t => [t.topic, t]));
  const topicsToImprove = weakTopics.map(w => ({
    topic: w.topic,
    score: w.score,
    target: TARGET_SCORE,
    gap: Math.max(0, TARGET_SCORE - w.score),
    priority: w.priority,
    earlierAverage: historyTopics.get(w.topic) ? historyTopics.get(w.topic).average : null,
    missingConcepts: w.missingConcepts
  }));

  const previous = (history ? history.sessions : []).filter(s => typeof s.score === 'number').sort((a, b) => new Date(b.at) - new Date(a.at));
  const previousScore = previous.length ? previous[0].score : null;
  const previousAverage = previous.length ? Math.round(previous.reduce((a, s) => a + s.score, 0) / previous.length) : null;

  return {
    currentScore: overall,
    targetScore: TARGET_SCORE,
    targetLabel: 'Placement-ready',
    gap,
    readyNow: gap === 0,
    dimensionGaps,
    fastestPath,
    topicsToImprove,
    conceptsToLearn,
    recurringWeaknesses: history ? history.recurring : [],
    history: {
      interviewsBefore: previous.length,
      previousScore,
      previousAverage,
      change: previousScore === null ? null : overall - previousScore,
      recentScores: previous.slice(0, 5).map(s => ({ score: s.score, date: s.at }))
    }
  };
}

/** Deterministic analysis paragraphs from the numbers (used when the model is unavailable). */
function analysisFallback(a) {
  const paras = [];
  paras.push(a.readyNow
    ? `You scored ${a.currentScore}/100, which meets the placement-ready target of ${a.targetScore}.`
    : `You scored ${a.currentScore}/100. The placement-ready target is ${a.targetScore}, so you need ${a.gap} more points.`);
  if (a.dimensionGaps.length) {
    paras.push(`The fastest gains: ${a.dimensionGaps.slice(0, 3).map(d => `raise ${d.name} from ${d.score} to ${d.target} (+${d.pointsGain} overall)`).join('; ')}.`);
  }
  if (a.history.previousScore !== null) {
    const ch = a.history.change;
    paras.push(`Compared with your previous interview (${a.history.previousScore}/100) your score ${ch > 0 ? `improved by ${ch}` : ch < 0 ? `dropped by ${-ch}` : 'did not change'}.${a.recurringWeaknesses.length ? ` Concepts you keep missing: ${a.recurringWeaknesses.slice(0, 3).map(r => r.concept).join(', ')}.` : ''}`);
  }
  return paras;
}

async function generateSummary(questionRows, overall, analysis = null) {
  const prompt = renderPrompt('feedback_generator');
  const data = questionRows.map(q => ({ topic: q.topic, score: q.score, verdict: q.verdict, strengths: q.identifiedStrengths, missing: q.missingConcepts, incorrectClaims: q.incorrectClaims }));
  const facts = analysis ? {
    targetScore: analysis.targetScore,
    gapToTarget: analysis.gap,
    dimensionGaps: analysis.dimensionGaps.map(d => ({ dimension: d.name, score: d.score, pointsGainIfRaisedToTarget: d.pointsGain })),
    fastestPath: analysis.fastestPath,
    earlierInterviews: analysis.history,
    conceptsMissedRepeatedly: analysis.recurringWeaknesses.map(r => `${r.concept} (${r.times}x)`)
  } : null;
  try {
    let parsed = null;
    await providerFactory.execute('report_summary', p => p.generate({
      system: prompt.text,
      prompt: `Overall score: ${overall}/100\nPer-question data (JSON):\n${JSON.stringify(data).slice(0, 5000)}${facts ? `\nComputed improvement facts (JSON):\n${JSON.stringify(facts).slice(0, 2500)}` : ''}`,
      temperature: 0.3,
      maxTokens: 900,
      json: true,
      model: config.ai.evaluationModel
    }), {
      maxRetries: 1,
      validate: res => {
        parsed = parseModelJson(res.text);
        return Boolean(parsed && typeof parsed.summary === 'string' && parsed.summary.length > 20);
      }
    });
    const paragraphs = Array.isArray(parsed.analysis) ? parsed.analysis.filter(s => typeof s === 'string' && s.trim().length > 20).map(s => s.trim()).slice(0, 4) : [];
    return {
      summary: parsed.summary.trim(),
      analysis: paragraphs.length ? paragraphs : (analysis ? analysisFallback(analysis) : []),
      studyFocus: Array.isArray(parsed.studyFocus) ? parsed.studyFocus.filter(s => typeof s === 'string').slice(0, 4) : [],
      generated: true
    };
  } catch {
    // Deterministic summary from the numbers when the generator is unavailable
    const weakest = [...questionRows].sort((a, b) => a.score - b.score)[0];
    return {
      summary: `Overall score ${overall}/100 across ${questionRows.length} evaluated answer(s).${weakest ? ` Lowest-scoring topic: ${weakest.topic} (${weakest.score}%).` : ''}`,
      analysis: analysis ? analysisFallback(analysis) : [],
      studyFocus: [],
      generated: false
    };
  }
}

function toQuestionRow(turn, ev) {
  return {
    questionNumber: turn.sequence,
    question: turn.question,
    candidateAnswer: turn.answer,
    phase: turn.phase,
    strategy: turn.strategy,
    topic: turn.topic || 'General',
    difficulty: turn.difficulty,
    score: ev.overall,
    verdict: ev.classification,
    confidence: ev.confidence,
    answerQuality: ev.overall >= 85 ? 'Exceptional' : ev.overall >= 70 ? 'Strong' : ev.overall >= 50 ? 'Moderate' : 'Needs Improvement',
    evidenceQuote: (ev.evidence || [])[0] || '',
    evidence: ev.evidence || [],
    dimensionScores: ev.dimensions,
    conceptAnalysis: ev.conceptAnalysis || [],
    identifiedStrengths: ev.strengths || [],
    missingConcepts: ev.missingConcepts || [],
    incorrectClaims: (ev.incorrectClaims || []).map(c => (c.correction ? `"${c.claim}": ${c.correction}` : `"${c.claim}"`)),
    betterSampleAnswer: ev.idealAnswer || '',
    actionableTask: (ev.improvementActions || [])[0] || '',
    improvementActions: ev.improvementActions || [],
    followUpNeeded: ev.followUpNeeded,
    reviewRequired: ev.reviewRequired,
    conflict: ev.conflict,
    evaluationStatus: ev.status,
    evaluatorMetadata: {
      evaluatorVersion: ev.evaluatorVersion,
      promptVersion: ev.promptVersion,
      provider: ev.provider,
      model: ev.model,
      signalsAvailable: ev.signalsAvailable
    }
  };
}

async function buildReportPayload(session, turns, evaluations) {
  const evById = new Map(evaluations.map(e => [e._id.toString(), e]));
  const rows = [];
  let failed = 0;
  let pending = 0;
  turns.filter(t => t.answer && t.phase !== 'FINAL').forEach(t => {
    const ev = t.evaluationId ? evById.get(t.evaluationId.toString()) : null;
    if (!ev) { pending += 1; return; }
    if (ev.status === 'failed') { failed += 1; return; }
    rows.push(toQuestionRow(t, ev));
  });

  const overall = rows.length ? Math.round(mean(rows.map(r => r.score))) : 0;
  const dimensions = DIMENSION_META.map(d => ({
    name: d.name,
    key: d.key,
    score: rows.length ? Math.round(mean(rows.map(r => r.dimensionScores[d.key]))) : 0,
    weightPercentage: Math.round(config.evaluation.weights[d.key] * 100),
    description: d.description
  }));

  // Strengths / improvements aggregated from the evaluated answers (with their evidence)
  const strengths = [];
  rows.forEach(r => r.identifiedStrengths.forEach(s => {
    if (strengths.length < 5 && !strengths.some(x => x.title === s)) {
      strengths.push({ id: `st-${strengths.length + 1}`, title: s, evidence: r.evidenceQuote, impact: `Observed in question ${r.questionNumber} (${r.topic}).` });
    }
  }));
  const improvements = [];
  rows.forEach(r => {
    r.incorrectClaims.forEach(c => {
      if (improvements.length < 6) improvements.push({ id: `imp-${improvements.length + 1}`, title: `Incorrect claim: ${c}`, whyItMatters: `Question ${r.questionNumber} (${r.topic}).`, specificNextAction: r.actionableTask || `Review ${r.topic}.` });
    });
    r.missingConcepts.forEach(c => {
      if (improvements.length < 6 && !improvements.some(x => x.title === c)) improvements.push({ id: `imp-${improvements.length + 1}`, title: c, whyItMatters: `Missing from your answer to question ${r.questionNumber} (${r.topic}).`, specificNextAction: r.actionableTask || `Study ${c}.` });
    });
  });

  // Per-topic results → weak topics, mastery changes and next difficulty
  const byTopic = new Map();
  rows.forEach(r => {
    const t = byTopic.get(r.topic) || { topic: r.topic, scores: [], missing: [] };
    t.scores.push(r.score);
    t.missing.push(...r.missingConcepts);
    byTopic.set(r.topic, t);
  });
  const weakTopics = Array.from(byTopic.values())
    .map(t => ({ topic: t.topic, score: Math.round(mean(t.scores)), reason: t.missing[0] ? `Missing: ${Array.from(new Set(t.missing)).slice(0, 3).join(', ')}` : 'Below target score', recommendedAction: `Practice ${t.topic} questions and review the reference answers.`, priority: mean(t.scores) < 50 ? 'High' : 'Medium', missingConcepts: Array.from(new Set(t.missing)).slice(0, 4) }))
    .filter(t => t.score < 70)
    .sort((a, b) => a.score - b.score);

  const masteryChanges = [];
  const seen = new Map();
  turns.forEach(t => {
    if (!t.masteryChange) return;
    const mc = t.masteryChange;
    const entry = seen.get(mc.topic) || { topic: mc.topic, before: mc.before, after: mc.after, transitions: [] };
    entry.after = mc.after;
    if (mc.transition && mc.transition.changed) entry.transitions.push(mc.transition.rule);
    seen.set(mc.topic, entry);
  });
  seen.forEach(v => masteryChanges.push(v));

  const focusTopic = weakTopics[0] ? weakTopics[0].topic : (rows[0] ? rows[0].topic : null);
  const recommendedDifficulty = focusTopic ? await getTopicDifficulty(session.userId, focusTopic, 'interview') : 'Medium';
  // Earlier interviews from long-term memory (this session excluded)
  const history = await interviewMemory.historySummary(session.userId, { excludeSessionId: session._id }).catch(() => null);
  const analysis = rows.length ? buildImprovementAnalysis({ overall, dimensions, weakTopics, rows, history }) : null;
  const summary = rows.length
    ? await generateSummary(rows, overall, analysis)
    : { summary: 'No answers could be evaluated for this session.', analysis: [], studyFocus: [], generated: false };

  const plan = weakTopics.length || rows.length
    ? await createPlan(session.userId, {
      weaknesses: (weakTopics.length ? weakTopics : Array.from(byTopic.values()).map(t => ({ topic: t.topic, score: mean(t.scores), missingConcepts: t.missing }))).map(w => ({ topic: w.topic, score: w.score, missingConcepts: w.missingConcepts || w.missing })),
      targetRole: session.jobRole,
      source: 'interview_report',
      sourceId: session._id.toString()
    })
    : null;

  const stats = communicationStats(turns, session);
  // Camera tutor feedback from the analysed webcam frames (null when the camera was off)
  const frames = await InterviewFrame.find({ sessionId: session._id }).sort({ seq: 1 }).lean();
  const visualAudit = vision.buildVisualAudit(frames);
  if (visualAudit && !visualAudit.unavailable) visualAudit.summary = vision.auditSummary(visualAudit);
  const resumeTurns = rows.filter(r => r.phase === 'RESUME');
  const resourceTopics = Array.from(new Set([...weakTopics.map(w => w.topic), ...rows.map(r => r.topic)]));

  return {
    sessionId: session._id.toString(),
    role: session.jobRole,
    jobRole: session.jobRole,
    company: session.companyTarget,
    companyTarget: session.companyTarget,
    roundType: session.interviewType,
    interviewType: session.interviewType,
    persona: session.persona,
    createdAt: session.createdAt,
    durationSeconds: stats.durationSeconds,
    overallScore: overall,
    grade: grade(rows.length ? overall : null),
    status: failed || pending ? 'partial' : 'ready',
    evaluationSummary: { evaluated: rows.length, failed, pending, reviewRequired: rows.filter(r => r.reviewRequired).length },
    dimensions,
    strengths,
    improvements,
    questionAnalysis: rows,
    communicationStats: stats,
    communicationObservations: communicationObservations(stats),
    resumeObservations: resumeTurns.map(r => `Q${r.questionNumber}: ${r.question} Scored ${r.score}% (${r.verdict.replace('_', ' ').toLowerCase()}).`),
    weakTopics,
    masteryChanges,
    nextRecommendation: {
      recommendedInterviewType: overall >= 75 ? 'Technical Round' : 'Resume Based',
      recommendedDifficulty,
      focusAreas: weakTopics.map(w => w.topic).concat(summary.studyFocus).filter((v, i, a) => a.indexOf(v) === i).slice(0, 5),
      readinessComment: summary.summary
    },
    improvementAnalysis: analysis ? {
      ...analysis,
      summary: summary.summary,
      narrative: summary.analysis,
      studyFocus: summary.studyFocus,
      narrativeSource: summary.generated ? config.ai.evaluationModel : 'computed'
    } : null,
    studyPlan: serializePlan(plan),
    resources: resourceTopics.map(t => TOPIC_RESOURCES[t]).filter(Boolean).slice(0, 4),
    visualAudit,
    evaluatorVersion: config.evaluation.version,
    shareToken: session.shareToken || null
  };
}

/**
 * Reports stored before the improvement analysis existed get it computed from their own data and
 * the student's history (deterministic text, no model call), then persisted.
 */
async function ensureImprovementAnalysis(report) {
  const p = report && report.payload;
  if (!p || p.improvementAnalysis !== undefined || !Array.isArray(p.questionAnalysis) || !p.questionAnalysis.length) return report;
  const history = await interviewMemory.historySummary(report.userId, { excludeSessionId: report.sessionId }).catch(() => null);
  const analysis = buildImprovementAnalysis({
    overall: p.overallScore,
    dimensions: p.dimensions || [],
    weakTopics: p.weakTopics || [],
    rows: p.questionAnalysis.map(r => ({ ...r, missingConcepts: r.missingConcepts || [] })),
    history
  });
  report.payload = {
    ...p,
    improvementAnalysis: {
      ...analysis,
      summary: (p.nextRecommendation && p.nextRecommendation.readinessComment) || '',
      narrative: analysisFallback(analysis),
      studyFocus: (p.nextRecommendation && p.nextRecommendation.focusAreas) || [],
      narrativeSource: 'computed'
    }
  };
  report.markModified('payload');
  await report.save();
  return report;
}

/** Background job: complete evaluations then build and store the report. */
async function finalizeReport({ sessionId }) {
  const session = await InterviewSession.findById(sessionId);
  if (!session) return;
  await ensureTurnsFromTranscript(session);
  const turns = await InterviewTurn.find({ sessionId: session._id }).sort({ sequence: 1 });

  for (const turn of turns) {
    if (turn.answer && turn.phase !== 'FINAL' && !['completed', 'insufficient'].includes(turn.evaluationStatus)) {
      try {
        await evaluateTurn(turn, session);
      } catch (err) {
        console.warn(`[Report] evaluation of turn ${turn._id} failed: ${err.message}`);
      }
    }
  }

  // Camera tutor: analyse the webcam frames now that the interview is over (no live-turn model swaps)
  try {
    await vision.analyseSessionFrames(session._id);
  } catch (err) {
    console.warn(`[Report] frame analysis failed: ${err.message}`);
  }

  const fresh = await InterviewTurn.find({ sessionId: session._id }).sort({ sequence: 1 });
  const evaluations = await AnswerEvaluation.find({ sessionId: session._id });
  const payload = await buildReportPayload(session, fresh, evaluations);
  const status = payload.evaluationSummary.evaluated === 0 && payload.evaluationSummary.failed > 0 ? 'failed' : payload.status;

  await InterviewReport.findOneAndUpdate(
    { sessionId: session._id },
    { sessionId: session._id, userId: session.userId, status, evaluatorVersion: config.evaluation.version, payload },
    { upsert: true, new: true }
  );
  // Long-term memory for future interviews (RAG); a failure here must not fail the report
  if (status !== 'failed') {
    await interviewMemory.indexSession(session, payload).catch(err => console.warn(`[Report] memory indexing failed: ${err.message}`));
  }
  session.overallScore = payload.overallScore;
  session.scoreBreakdown = { dimensions: Object.fromEntries(payload.dimensions.map(d => [d.key, d.score])) };
  session.reportStatus = status;
  session.reportError = status === 'failed' ? 'The evaluation model was unavailable. Retry the report later.' : null;
  session.reportGeneratedAt = new Date();
  session.status = 'completed';
  await session.save();

  if (status !== 'failed') {
    const user = await User.findById(session.userId);
    await notifyUser(user, {
      type: 'report_ready',
      title: 'Interview Report Ready',
      message: `Your ${session.companyTarget || ''} ${session.interviewType} report is ready (score ${payload.overallScore}/100).`.replace(/\s+/g, ' '),
      actionUrl: `/report/${session._id}`,
      severity: 'success'
    });
  }
}

async function requestReport(session) {
  session.reportStatus = 'processing';
  session.status = 'processing_report';
  await session.save();
  await jobQueue.enqueue('interview.finalize', { sessionId: session._id.toString() }, { priority: 2, dedupeKey: `final:${session._id}`, maxAttempts: 2 });
}

function registerJobHandlers() {
  jobQueue.registerHandler('interview.finalize', finalizeReport);
}

module.exports = { DIMENSION_META, TARGET_SCORE, buildImprovementAnalysis, ensureImprovementAnalysis, buildReportPayload, finalizeReport, requestReport, registerJobHandlers, communicationStats };
