/**
 * Interview orchestration (spec §5.2, §11, §23.1 Interview Service).
 *
 * Request path (latency-sensitive):
 *   answer → persist turn → quick Laya signals → deterministic strategy/phase/topic/difficulty
 *   → LLM phrases the next utterance (validated) → persist next turn
 * Background (job queue, never blocks a live turn):
 *   reference pack for each question → multi-signal evaluation of each answer → mastery update
 *   → on completion, report generation.
 */
const config = require('../config/env');
const InterviewSession = require('../models/InterviewSession');
const InterviewTurn = require('../models/InterviewTurn');
const Resume = require('../models/Resume');
const { providerFactory } = require('./providers/AIProviderFactory');
const layaClient = require('./layaClient');
const { renderPrompt } = require('../prompts');
const { buildReferencePack } = require('./referenceService');
const { evaluateAnswer } = require('./evaluationEngine');
const { saveEvaluation } = require('./evaluationStore');
const interviewMemory = require('./interviewMemory');
const { recordTopicResult, getStudentAdaptiveProfile, getTopicDifficulty, INTERVIEW_TOPICS } = require('./adaptiveEngine');
const sm = require('./interviewStateMachine');
const jobQueue = require('./jobQueue');

const ENGINE_VERSION = 'interview-engine-v4';
const NO_MASTERY_PHASES = ['INTRODUCTION', 'BACKGROUND', 'FINAL'];
const FILLER_WORDS = ['um', 'uh', 'erm', 'like', 'you know', 'basically', 'actually', 'sort of', 'kind of'];
const CORE_TECH_TOPICS = [
  'Data Structures & Algorithms',
  'Database Systems & SQL',
  'Operating Systems & Networking',
  'Object-Oriented Programming',
  'Concurrency & Multithreading'
];

class InterviewError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

function countFillers(text) {
  const lower = ` ${String(text || '').toLowerCase()} `;
  return FILLER_WORDS.reduce((n, f) => n + (lower.match(new RegExp(`\\b${f}\\b`, 'g')) || []).length, 0);
}

async function getResumeContextForUser(userId) {
  const resume = await Resume.findOne({ userId }).sort({ createdAt: -1 });
  if (!resume) return null;
  const diag = resume.diagnosticData || {};
  return {
    resumeId: resume._id.toString(),
    filename: resume.filename,
    skills: resume.parsedSkills || [],
    hotspots: Array.isArray(diag.hotspots) ? diag.hotspots : [],
    rawTextSnippet: resume.rawText ? resume.rawText.slice(0, 1200) : ''
  };
}

/** Topic for a phase: deterministic, prefers the weakest topic not yet covered in this session. */
async function selectTopic(session, phase) {
  if (phase === 'RESUME') return 'Projects & Resume';
  if (['INTRODUCTION', 'BACKGROUND', 'FINAL', 'FEEDBACK'].includes(phase)) return 'Background & Motivation';
  if (phase === 'BEHAVIORAL_HR') return 'Behavioral & Communication';
  if (phase === 'SCENARIO_SYSTEM_THINKING') return 'System Design & Scalability';
  if (phase === 'PROBLEM_SOLVING') {
    return session.interviewType === 'Case Study / PM Round' ? 'System Design & Scalability' : 'Data Structures & Algorithms';
  }
  const profile = await getStudentAdaptiveProfile(session.userId, 'interview');
  const mastery = new Map(profile.topics.map(t => [t.topic, t.masteryScore]));
  const covered = new Set(session.topicsCovered || []);
  const candidates = CORE_TECH_TOPICS.filter(t => !covered.has(t));
  const pool = candidates.length ? candidates : CORE_TECH_TOPICS;
  // Unpractised topics are treated as mid-range (50) so known weak topics come first
  return pool
    .map((t, i) => ({ t, m: mastery.has(t) ? mastery.get(t) : 50, i }))
    .sort((a, b) => a.m - b.m || a.i - b.i)[0].t;
}

/** Per-topic difficulty clamped into the phase's difficulty envelope. */
async function selectDifficulty(userId, topic, phase) {
  const levels = ['Easy', 'Medium', 'Hard'];
  let d = await getTopicDifficulty(userId, topic, 'interview');
  if (phase === 'TECHNICAL_BASICS' && d === 'Hard') d = 'Medium';
  if ((phase === 'TECHNICAL_DEPTH' || phase === 'SCENARIO_SYSTEM_THINKING') && d === 'Easy') d = 'Medium';
  return levels.includes(d) ? d : 'Medium';
}

function resumeBlockFor(session, phase, resumeIndex) {
  const ctx = session.resumeContext;
  if (!ctx) return '';
  if (phase === 'RESUME' && ctx.hotspots && ctx.hotspots.length) {
    const hs = ctx.hotspots[resumeIndex % ctx.hotspots.length];
    return `Resume item to probe (from the candidate's resume):\n<resume_excerpt>\n${hs.title}: ${hs.detail || ''}\n</resume_excerpt>`;
  }
  if (ctx.skills && ctx.skills.length) {
    return `Skills listed on the candidate's resume: ${ctx.skills.slice(0, 10).join(', ')}.`;
  }
  return '';
}

/**
 * Models sometimes continue the transcript format (a fake "<candidate_answer>" turn, then
 * "Interviewer: ..."). Keep only the interviewer's final utterance and drop any prompt markup.
 */
function cleanUtterance(raw) {
  let text = String(raw || '');
  const lastSpeaker = text.lastIndexOf('Interviewer:');
  if (lastSpeaker >= 0) text = text.slice(lastSpeaker + 'Interviewer:'.length);
  text = text
    .replace(/<candidate_answer>[\s\S]*?<\/candidate_answer>/gi, ' ')
    .replace(/<\/?(candidate_answer|resume_excerpt)>/gi, ' ')
    .replace(/^\s*(Candidate|Interviewer)\s*:\s*/i, '');
  return text.trim().replace(/^["']|["']$/g, '').replace(/\s+/g, ' ').trim();
}

async function generateUtterance({ session, phase, topic, difficulty, strategy, history, resumeIndex = 0, previousQuestions = [], memoryBlock = '' }) {
  const phaseInfo = sm.PHASES[phase] || sm.PHASES.FINAL;
  const prompt = renderPrompt('interviewer_system', {
    persona: session.persona,
    company: session.companyTarget || 'the company',
    role: session.jobRole,
    interviewType: session.interviewType,
    phaseName: phaseInfo.name,
    phaseGoal: phaseInfo.goal,
    topic,
    difficulty,
    strategy,
    strategyGuidance: sm.STRATEGIES[strategy],
    resumeBlock: resumeBlockFor(session, phase, resumeIndex)
  });

  const convo = history.slice(-6).map(t => [
    `Interviewer: ${t.question}`,
    t.answer ? `Candidate:\n<candidate_answer>\n${t.answer}\n</candidate_answer>` : ''
  ].filter(Boolean).join('\n')).join('\n');

  const instruction = strategy === 'CLOSING'
    ? 'Write your closing remark now (no new question).'
    : `Write your next utterance now: briefly acknowledge the candidate's last answer in a few words if appropriate, then ask exactly one ${strategy === 'NEW_QUESTION' ? `new ${phaseInfo.name} question about ${topic}` : 'follow-up question'}.`;

  const wellFormed = text => isWellFormedUtterance(text);
  const followUp = strategy !== 'NEW_QUESTION' && strategy !== 'CLOSING';
  const distinct = text => strategy === 'CLOSING' || sm.isDistinctQuestion(text, previousQuestions, { followUp });
  // The model occasionally replies with the candidate's own answer, as if it were the candidate
  const lastAnswer = [...history].reverse().find(t => t.answer)?.answer || '';
  const ownVoice = text => !sm.echoesAnswer(text, lastAnswer);

  let result;
  try {
    result = await providerFactory.execute('interview_turn', provider => provider.generate({
      system: prompt.text,
      prompt: [memoryBlock, convo, instruction].filter(Boolean).join('\n\n'),
      temperature: 0.6,
      maxTokens: 160
    }), {
      maxRetries: 1,
      validate: res => {
        const text = cleanUtterance(res.text);
        return wellFormed(text) && distinct(text) && ownVoice(text);
      }
    });
  } catch (err) {
    // The model answered but every attempt failed validation (e.g. a repeated question):
    // ask a deterministic question for the planned phase/topic instead of stalling the interview.
    // A provider that is down is still reported as an error.
    if (!/does not match the required schema/.test(err.message || '')) throw err;
    const text = fallbackUtterance({ strategy, phase: phaseInfo.name, topic, previousQuestions });
    return { text, model: 'deterministic-fallback', promptVersion: prompt.version };
  }
  return {
    text: cleanUtterance(result.text),
    model: result.model,
    promptVersion: prompt.version
  };
}

/**
 * A usable interviewer utterance: sensible length and no leaked transcript markup. Only PrepAI's own
 * prompt tags count as markup — code such as List<String> or Map<K, V> is a legitimate question.
 */
function isWellFormedUtterance(text) {
  const words = String(text || '').split(/\s+/).filter(Boolean).length;
  return words >= 4 && words <= 90 && !/Candidate\s*:|<\/?(candidate_answer|resume_excerpt)>/i.test(text);
}

/** Plain, topic-specific question used when the model's output is unusable. */
function fallbackUtterance({ strategy, phase, topic, previousQuestions = [] }) {
  const subject = topic && topic !== 'General' ? topic : phase;
  const byStrategy = {
    CLOSING: 'Thank you for your answers today. That concludes the interview. Please end the session to see your report.',
    CLARIFICATION: 'Could you clarify your last answer and support it with one concrete example?',
    CORRECTION: 'Let us revisit that. Could you re-check your last statement and explain how it actually works?',
    DEPTH: 'Could you go one level deeper and explain how that works internally?',
    CHALLENGE: 'Good. How would your approach change at a much larger scale or when a component fails?'
  };
  const candidates = [
    byStrategy[strategy],
    `Let us move to ${subject}. Could you explain one core concept in ${subject} and give a practical example?`,
    `In ${subject}, what is a common mistake engineers make, and how would you avoid it?`,
    `Could you walk me through a problem you would solve using ${subject}, step by step?`
  ].filter(Boolean);
  return candidates.find(q => strategy === 'CLOSING' || sm.isDistinctQuestion(q, previousQuestions)) || candidates[candidates.length - 1];
}

// Persona ids are interviewer styles, not names: 'Technical Lead' reads as 'the technical lead'
const PERSONA_INTRO = {
  'Corporate HR': 'your HR interviewer',
  'Technical Lead': 'the technical lead interviewing you',
  'Startup Founder': 'the founder interviewing you',
  'Panel Interviewer': 'part of the interview panel'
};

function introQuestion(session, candidateName, history = null) {
  const first = String(candidateName || '').split(' ')[0] || 'there';
  // Returning students: mention their weakest earlier topic (taken from their own evaluated history)
  const weakest = history && history.sessions.length
    ? [...history.topics].filter(t => t.average < 70).sort((a, b) => a.average - b.average)[0]
    : null;
  const greeting = history && history.sessions.length ? `Welcome back, ${first}.` : `Hello ${first}.`;
  const memory = weakest ? ` In your earlier mock interviews, ${weakest.topic} needed the most work, so we may revisit it today.` : '';
  return `${greeting} I'm ${PERSONA_INTRO[session.persona] || 'your interviewer'}, and I'll be conducting your ${session.interviewType} for the ${session.jobRole} role${session.companyTarget ? ` at ${session.companyTarget}` : ''}.${memory} To start, could you briefly introduce yourself?`;
}

function transcriptEntry(role, content) {
  return { role, content, timestamp: new Date().toISOString() };
}

async function startInterview(user, { jobRole, companyTarget, interviewType, persona }) {
  const resumeContext = await getResumeContextForUser(user._id);
  const plan = sm.planFor(interviewType, { hasResume: Boolean(resumeContext && resumeContext.hotspots.length) });
  const session = await InterviewSession.create({
    userId: user._id,
    jobRole: jobRole || 'Software Developer (SDE)',
    companyTarget: companyTarget || '',
    interviewType: sm.PHASE_PLANS[interviewType] ? interviewType : 'Technical Round',
    persona: persona || 'Technical Lead',
    status: 'active',
    engineVersion: ENGINE_VERSION,
    plan,
    cursor: { phaseIndex: 0, questionsAskedInPhase: 1, followUpsForQuestion: 0, finished: false },
    currentPhaseId: 'INTRODUCTION',
    resumeContext,
    transcript: [],
    turnCount: 0
  });

  const history = await interviewMemory.historySummary(user._id, { excludeSessionId: session._id }).catch(() => null);
  const question = introQuestion(session, user.fullName, history);
  const turn = await InterviewTurn.create({
    sessionId: session._id,
    userId: user._id,
    sequence: 1,
    phase: 'INTRODUCTION',
    strategy: 'NEW_QUESTION',
    topic: 'Background & Motivation',
    difficulty: 'Easy',
    question,
    questionPromptVersion: 'intro-template-v1'
  });
  session.transcript.push(transcriptEntry('assistant', question));
  session.turnCount = 1;
  await session.save();
  await jobQueue.enqueue('interview.reference', { turnId: turn._id.toString() }, { priority: 3, dedupeKey: `ref:${turn._id}` });
  return { session, turn };
}

/**
 * Records the candidate's answer and produces the next interviewer utterance.
 * @param {object} speech optional observable signals from the browser
 */
async function answerTurn(session, user, answerText, speech = {}) {
  const answer = String(answerText || '').trim();
  if (!answer) throw new InterviewError('Answer text is required');
  if (answer.length > 6000) throw new InterviewError('Answer is too long (max 6000 characters)');
  if (session.status === 'completed' || session.status === 'processing_report') throw new InterviewError('This interview has already ended.', 409);
  if (session.cursor && session.cursor.finished) throw new InterviewError('The interview is complete. End the interview to get your report.', 409);

  // One answer per interview at a time (double "Send" / voice auto-send must not race)
  const lockKey = String(session._id);
  if (answersInFlight.has(lockKey)) {
    throw new InterviewError('Your previous answer is still being processed. Please wait a moment.', 409);
  }
  answersInFlight.add(lockKey);
  try {
    return await answerTurnLocked(session, answer, speech);
  } finally {
    answersInFlight.delete(lockKey);
  }
}

const answersInFlight = new Set();

async function answerTurnLocked(session, answer, speech) {
  const turns = await InterviewTurn.find({ sessionId: session._id }).sort({ sequence: 1 });
  const open = turns[turns.length - 1];
  if (!open) throw new InterviewError('There is no open question to answer.', 409);
  // An answered last turn means an earlier request saved the answer but never produced the next
  // question (older versions saved first). Accept the re-sent answer so the interview can continue.

  return jobQueue.foreground(async () => {
    // 1) Persist the answer with observable speech/turn signals
    open.answer = answer;
    open.answeredAt = new Date();
    open.speech = {
      inputMode: speech.inputMode === 'voice' ? 'voice' : 'text',
      speakingDurationMs: Number.isFinite(speech.speakingDurationMs) ? Math.max(0, Math.round(speech.speakingDurationMs)) : null,
      responseLatencyMs: Number.isFinite(speech.responseLatencyMs) ? Math.max(0, Math.round(speech.responseLatencyMs)) : Math.max(0, open.answeredAt - open.askedAt),
      interrupted: Boolean(speech.interrupted),
      interruptionCount: Number.isFinite(speech.interruptionCount) ? speech.interruptionCount : (speech.interrupted ? 1 : 0),
      fillerWordCount: countFillers(answer),
      wordCount: answer.split(/\s+/).filter(Boolean).length
    };

    // 2) Quick Laya signals for strategy selection (bounded budget; missing signal → default strategy)
    let signals = null;
    if (open.phase !== 'FINAL') {
      const laya = await layaClient.decideBatch({
        question: open.question,
        expectedConcepts: open.reference && open.reference.status === 'ready' ? open.reference.expectedConcepts : [],
        studentAnswer: answer,
        decisions: ['answer_state', 'followup_needed', 'response_state', 'unsupported_claim', 'relevance'],
        includeConcepts: false
      }, { feature: 'interview_turn_signals', timeoutMs: config.laya.turnTimeoutMs });
      if (laya.available) signals = laya.decisions;
    }
    open.turnSignals = signals;
    open.evaluationStatus = open.phase === 'FINAL' ? 'none' : 'pending';
    // The answer is persisted only after the next question exists (step 5), so a failed
    // generation never leaves the interview without an open question.

    // 3) Deterministic decision: follow-up strategy or advance the phase
    const plan = session.plan && session.plan.length ? session.plan : sm.planFor(session.interviewType);
    const cursor = { ...(session.cursor ? session.cursor.toObject ? session.cursor.toObject() : session.cursor : {}) };
    const choice = sm.selectStrategy({ phase: open.phase, followUpsForQuestion: cursor.followUpsForQuestion || 0, signals });

    let phase = open.phase;
    let strategy = choice.strategy;
    let topic = open.topic;
    let difficulty = open.difficulty;
    if (strategy === 'NEW_QUESTION') {
      const next = sm.advance(plan, { phaseIndex: cursor.phaseIndex || 0, questionsAskedInPhase: cursor.questionsAskedInPhase || 0 });
      if (next.finished) {
        phase = 'FEEDBACK';
        strategy = 'CLOSING';
        cursor.finished = true;
      } else {
        phase = next.phase;
        cursor.phaseIndex = next.phaseIndex;
        cursor.questionsAskedInPhase = next.questionsAskedInPhase + 1;
        cursor.followUpsForQuestion = 0;
        topic = await selectTopic(session, phase);
        difficulty = await selectDifficulty(session.userId, topic, phase);
      }
    } else {
      cursor.followUpsForQuestion = (cursor.followUpsForQuestion || 0) + 1;
    }

    // 4) The model phrases the utterance; code validated phase/topic/difficulty/duplicates
    const resumeIndex = turns.filter(t => t.phase === 'RESUME' && t.strategy === 'NEW_QUESTION').length;
    const utterance = await generateUtterance({
      session,
      phase,
      topic: topic || 'General',
      difficulty: difficulty || 'Medium',
      strategy,
      history: turns.map(t => ({ question: t.question, answer: t.answer })),
      resumeIndex,
      previousQuestions: turns.map(t => t.question),
      // Retrieved history from earlier interviews (RAG); empty for first-time students
      memoryBlock: strategy === 'CLOSING'
        ? ''
        : await interviewMemory.promptBlock(session.userId, { query: `${topic || phase}. ${open.question} ${answer}`, excludeSessionId: session._id })
    });

    // 5) Persist the answer, the next turn and the transcript (transcript kept for the existing UI)
    await open.save();
    if (open.phase !== 'FINAL') {
      await jobQueue.enqueue('interview.evaluate', { turnId: open._id.toString() }, { priority: 4, dedupeKey: `eval:${open._id}` });
    }
    const nextTurn = await InterviewTurn.create({
      sessionId: session._id,
      userId: session.userId,
      sequence: open.sequence + 1,
      phase,
      strategy,
      strategyReason: choice.reason,
      topic,
      difficulty,
      question: utterance.text,
      questionPromptVersion: utterance.promptVersion,
      questionModel: utterance.model
    });
    session.transcript.push(transcriptEntry('user', answer));
    session.transcript.push(transcriptEntry('assistant', utterance.text));
    session.markModified('transcript');
    session.turnCount = nextTurn.sequence;
    session.cursor = cursor;
    session.currentPhaseId = phase;
    if (topic && sm.PHASES[phase] && sm.PHASES[phase].technical && !session.topicsCovered.includes(topic)) {
      session.topicsCovered.push(topic);
    }
    await session.save();
    if (strategy !== 'CLOSING') {
      await jobQueue.enqueue('interview.reference', { turnId: nextTurn._id.toString() }, { priority: 3, dedupeKey: `ref:${nextTurn._id}` });
    }

    return {
      aiResponse: utterance.text,
      phaseId: phase,
      currentPhase: (sm.PHASES[phase] || {}).name,
      nextPhaseIndex: sm.uiPhaseIndex(phase, strategy),
      strategy,
      strategyReason: choice.reason,
      isFollowUpProbe: strategy !== 'NEW_QUESTION' && strategy !== 'CLOSING',
      isFinalWrapup: strategy === 'CLOSING',
      topic,
      difficulty,
      turnCount: nextTurn.sequence
    };
  });
}

// ---------------------------------------------------------------------------
// Background handlers
// ---------------------------------------------------------------------------

async function ensureReference(turn, session) {
  if (turn.reference && turn.reference.status === 'ready') return turn.reference;
  try {
    const pack = await buildReferencePack({
      question: turn.question,
      topic: turn.topic,
      difficulty: turn.difficulty,
      role: session ? session.jobRole : undefined
    });
    turn.reference = { status: 'ready', ...pack };
  } catch (err) {
    // No reference → the evaluator grades against standard knowledge (recorded on the turn)
    turn.reference = { ...(turn.reference ? (turn.reference.toObject ? turn.reference.toObject() : turn.reference) : {}), status: 'failed' };
  }
  await turn.save();
  return turn.reference;
}

const LIVE_IDLE_MS = 20 * 60 * 1000;

/**
 * When grading uses a different model than the dialogue, loading it during a live interview
 * evicts the dialogue model from VRAM and adds ~12 s to the next turn. Background grading for a
 * session therefore waits until the interview has ended (or gone idle).
 */
function shouldDeferForLiveSession(session) {
  if (!session || config.ai.evaluationModel === config.ai.model) return false;
  if (session.endedAt || session.status === 'completed') return false;
  return Date.now() - new Date(session.updatedAt || session.createdAt).getTime() < LIVE_IDLE_MS;
}

async function handleReferenceJob({ turnId }) {
  const turn = await InterviewTurn.findById(turnId);
  if (!turn) return;
  const session = await InterviewSession.findById(turn.sessionId);
  if (shouldDeferForLiveSession(session)) throw jobQueue.deferJob(20000, 'interview in progress');
  await ensureReference(turn, session);
}

/** Evaluates one answered turn, persists the evaluation and updates topic mastery. */
async function evaluateTurn(turn, session) {
  if (!turn.answer || turn.phase === 'FINAL') return null;
  const reference = await ensureReference(turn, session);
  const result = await evaluateAnswer({
    question: turn.question,
    answer: turn.answer,
    role: session ? session.jobRole : undefined,
    topic: turn.topic,
    difficulty: turn.difficulty,
    reference: reference && reference.status === 'ready' ? reference : {}
  });
  const doc = await saveEvaluation(result, { turnId: turn._id, sessionId: turn.sessionId, userId: turn.userId });
  turn.evaluationId = doc._id;
  turn.evaluationStatus = result.status === 'completed' ? 'completed' : (result.status === 'insufficient_evidence' ? 'insufficient' : 'failed');

  // Warm-up phases describe the candidate, not a skill — they do not change topic mastery
  if (result.status !== 'failed' && turn.topic && !NO_MASTERY_PHASES.includes(turn.phase)) {
    const concepts = result.conceptAnalysis || [];
    const coverage = concepts.length ? concepts.filter(c => c.status === 'PRESENT').length / concepts.length : null;
    turn.masteryChange = await recordTopicResult(turn.userId, turn.topic, {
      score: result.overall,
      difficulty: turn.difficulty,
      conceptCoverage: coverage,
      source: 'interview',
      strengths: result.strengths || [],
      weaknesses: result.missingConcepts || []
    });
  }
  await turn.save();
  return { result, doc };
}

async function handleEvaluateJob({ turnId }) {
  const turn = await InterviewTurn.findById(turnId);
  if (!turn || ['completed', 'insufficient'].includes(turn.evaluationStatus)) return;
  const session = await InterviewSession.findById(turn.sessionId);
  if (shouldDeferForLiveSession(session)) throw jobQueue.deferJob(20000, 'interview in progress');
  const out = await evaluateTurn(turn, session);
  if (out && out.result.status === 'failed') {
    // Let the queue retry the evaluation later (provider may be temporarily unavailable)
    throw new Error(out.result.failureReason || 'evaluation failed');
  }
}

/** Builds turns for sessions created before the v4 engine (transcript only). */
async function ensureTurnsFromTranscript(session) {
  const count = await InterviewTurn.countDocuments({ sessionId: session._id });
  if (count > 0) return;
  let seq = 0;
  let pending = null;
  for (const item of session.transcript || []) {
    const speaker = item.role || item.speaker;
    const text = item.content || item.text || '';
    if (speaker === 'assistant' || speaker === 'ai') {
      if (pending) await InterviewTurn.create(pending);
      seq += 1;
      pending = { sessionId: session._id, userId: session.userId, sequence: seq, phase: seq === 1 ? 'INTRODUCTION' : 'TECHNICAL_BASICS', topic: seq === 1 ? 'Behavioral & Communication' : null, question: text, askedAt: item.timestamp || session.createdAt };
    } else if (pending) {
      pending.answer = text;
      pending.answeredAt = item.timestamp || session.createdAt;
      pending.evaluationStatus = 'pending';
      await InterviewTurn.create(pending);
      pending = null;
    }
  }
  if (pending) await InterviewTurn.create(pending);
}

function registerJobHandlers() {
  jobQueue.registerHandler('interview.reference', handleReferenceJob);
  jobQueue.registerHandler('interview.evaluate', handleEvaluateJob);
}

module.exports = {
  ENGINE_VERSION,
  InterviewError,
  countFillers,
  cleanUtterance,
  isWellFormedUtterance,
  fallbackUtterance,
  getResumeContextForUser,
  selectTopic,
  selectDifficulty,
  startInterview,
  answerTurn,
  evaluateTurn,
  shouldDeferForLiveSession,
  ensureReference,
  ensureTurnsFromTranscript,
  registerJobHandlers,
  INTERVIEW_TOPICS
};
