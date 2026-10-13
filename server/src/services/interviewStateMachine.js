/**
 * Interview state machine (spec §11, §33 INTERVIEW STATE MACHINE).
 *
 * States: INTRODUCTION → BACKGROUND → RESUME → TECHNICAL_BASICS → TECHNICAL_DEPTH →
 *         PROBLEM_SOLVING → SCENARIO_SYSTEM_THINKING → BEHAVIORAL_HR → FINAL → FEEDBACK
 *
 * Each interview type has a phase plan (how many primary questions per phase). The LLM only
 * phrases questions; this module decides the phase, whether the next utterance is a follow-up
 * (and which counter-question strategy), and validates duplicates — all deterministically.
 */

const PHASES = {
  INTRODUCTION: { name: 'Introduction', goal: 'warm up and let the candidate introduce themselves', technical: false, uiIndex: 0 },
  BACKGROUND: { name: 'Background', goal: 'education, motivation and basic profile', technical: false, uiIndex: 1 },
  RESUME: { name: 'Resume', goal: 'probe one specific project or skill claimed on the resume for evidence of real experience', technical: true, uiIndex: 1 },
  TECHNICAL_BASICS: { name: 'Technical Basics', goal: 'verify foundational knowledge of the topic with a clear conceptual question', technical: true, uiIndex: 2 },
  TECHNICAL_DEPTH: { name: 'Technical Depth', goal: 'increase the challenge: mechanisms, trade-offs and implementation detail', technical: true, uiIndex: 2 },
  PROBLEM_SOLVING: { name: 'Problem Solving', goal: 'a small problem or case: ask how they would approach and solve it', technical: true, uiIndex: 2 },
  SCENARIO_SYSTEM_THINKING: { name: 'Scenario & System Thinking', goal: 'an architecture or situational scenario testing structured trade-off thinking', technical: true, uiIndex: 4 },
  BEHAVIORAL_HR: { name: 'Behavioral / HR', goal: 'a behavioral question answerable with a STAR-style example', technical: false, uiIndex: 4 },
  FINAL: { name: 'Final', goal: 'close the interview and invite the candidate\'s questions', technical: false, uiIndex: 5 },
  FEEDBACK: { name: 'Feedback', goal: 'interview finished', technical: false, uiIndex: 6 }
};

const PHASE_ORDER = Object.keys(PHASES);
const COUNTER_QUESTION_UI_INDEX = 3;

// Primary questions per phase for each interview type
const PHASE_PLANS = {
  'Technical Round': { INTRODUCTION: 1, BACKGROUND: 1, RESUME: 1, TECHNICAL_BASICS: 2, TECHNICAL_DEPTH: 2, PROBLEM_SOLVING: 1, SCENARIO_SYSTEM_THINKING: 1, BEHAVIORAL_HR: 1, FINAL: 1 },
  'HR Round': { INTRODUCTION: 1, BACKGROUND: 2, RESUME: 1, SCENARIO_SYSTEM_THINKING: 1, BEHAVIORAL_HR: 3, FINAL: 1 },
  'Combined Round': { INTRODUCTION: 1, BACKGROUND: 1, RESUME: 1, TECHNICAL_BASICS: 1, TECHNICAL_DEPTH: 1, PROBLEM_SOLVING: 1, BEHAVIORAL_HR: 2, FINAL: 1 },
  'Resume Based': { INTRODUCTION: 1, BACKGROUND: 1, RESUME: 3, TECHNICAL_BASICS: 1, TECHNICAL_DEPTH: 1, BEHAVIORAL_HR: 1, FINAL: 1 },
  'Case Study / PM Round': { INTRODUCTION: 1, BACKGROUND: 1, PROBLEM_SOLVING: 2, SCENARIO_SYSTEM_THINKING: 2, BEHAVIORAL_HR: 1, FINAL: 1 }
};

const STRATEGIES = {
  NEW_QUESTION: 'Ask the next primary question for this phase.',
  CLARIFICATION: 'Ask the candidate to define or clarify the vague part of their last answer.',
  DEPTH: 'Ask a why/how/trade-off question that goes deeper into what the candidate just said.',
  CHALLENGE: 'Introduce an edge case or a scale constraint related to the candidate\'s last answer.',
  CORRECTION: 'Gently test the questionable claim in the candidate\'s last answer by asking them to reconsider or justify it.',
  CLOSING: 'Thank the candidate, close the interview politely, and tell them their feedback report will be prepared.'
};

const MAX_FOLLOW_UPS_PER_QUESTION = 1;

function planFor(interviewType, { hasResume = true } = {}) {
  const plan = { ...(PHASE_PLANS[interviewType] || PHASE_PLANS['Technical Round']) };
  if (!hasResume) delete plan.RESUME;
  return PHASE_ORDER.filter(p => plan[p]).map(p => ({ phase: p, questions: plan[p] }));
}

/**
 * Selects the counter-question strategy from Laya signals for the last answer.
 * Returns NEW_QUESTION when no follow-up is warranted or no signal is available.
 */
function selectStrategy({ phase, followUpsForQuestion, signals }) {
  if (!signals || followUpsForQuestion >= MAX_FOLLOW_UPS_PER_QUESTION || phase === 'FINAL' || phase === 'INTRODUCTION') {
    return { strategy: 'NEW_QUESTION', reason: signals ? 'follow_up_limit_or_phase' : 'no_signal' };
  }
  const get = name => signals[name] || null;
  const state = get('response_state');
  const answer = get('answer_state');
  const followup = get('followup_needed');
  const claim = get('unsupported_claim');
  const confident = d => d && d.confidence >= 0.45;
  const technical = PHASES[phase] && PHASES[phase].technical;

  if (confident(state) && (state.decision === 'NEEDS_CLARIFICATION' || state.decision === 'OFF_TOPIC')) {
    return { strategy: 'CLARIFICATION', reason: `response_state=${state.decision}` };
  }
  // A correct answer to a different question is off-topic, not strong: relevance mass on LOW/NONE wins
  const relevance = get('relevance');
  const p = (relevance && relevance.probabilities) || {};
  if ((p.LOW || 0) + (p.NONE || 0) >= 0.55 || (confident(relevance) && relevance.decision === 'NONE')) {
    return { strategy: 'CLARIFICATION', reason: 'relevance=LOW' };
  }
  if (!technical) return { strategy: 'NEW_QUESTION', reason: 'non_technical_phase' };
  if ((confident(claim) && claim.decision === 'YES') || (confident(answer) && answer.decision === 'INCORRECT') || (confident(state) && state.decision === 'TECHNICAL_ERROR')) {
    return { strategy: 'CORRECTION', reason: 'questionable_claim' };
  }
  if (confident(followup) && followup.decision === 'YES') {
    return { strategy: 'DEPTH', reason: 'followup_needed' };
  }
  if ((confident(state) && state.decision === 'STRONG') || (answer && answer.decision === 'CORRECT' && answer.confidence >= 0.6)) {
    return { strategy: 'CHALLENGE', reason: 'strong_answer' };
  }
  return { strategy: 'NEW_QUESTION', reason: 'answer_sufficient' };
}

/**
 * Advances the phase cursor after an answer to a primary question.
 * @param {Array<{phase, questions}>} plan
 * @param {{phaseIndex: number, questionsAskedInPhase: number}} cursor
 */
function advance(plan, cursor) {
  const current = plan[cursor.phaseIndex];
  if (current && cursor.questionsAskedInPhase < current.questions) {
    return { phaseIndex: cursor.phaseIndex, questionsAskedInPhase: cursor.questionsAskedInPhase, phase: current.phase, finished: false };
  }
  const nextIndex = cursor.phaseIndex + 1;
  if (nextIndex >= plan.length) {
    return { phaseIndex: plan.length, questionsAskedInPhase: 0, phase: 'FEEDBACK', finished: true };
  }
  return { phaseIndex: nextIndex, questionsAskedInPhase: 0, phase: plan[nextIndex].phase, finished: false };
}

function uiPhaseIndex(phase, strategy) {
  if (strategy && strategy !== 'NEW_QUESTION' && strategy !== 'CLOSING') return COUNTER_QUESTION_UI_INDEX;
  return PHASES[phase] ? PHASES[phase].uiIndex : 0;
}

/** True when the proposed question is not a near-duplicate of a previous one. */
const QUESTION_STOPWORDS = new Set([
  'the', 'and', 'you', 'your', 'are', 'was', 'were', 'for', 'with', 'that', 'this', 'what', 'how', 'why', 'when',
  'where', 'which', 'who', 'can', 'could', 'would', 'will', 'should', 'did', 'does', 'have', 'has', 'had', 'tell',
  'explain', 'describe', 'walk', 'through', 'about', 'please', 'give', 'example', 'from', 'into', 'some', 'any',
  'one', 'there', 'their', 'them', 'they', 'then', 'than', 'its', 'our', 'out', 'use', 'used', 'using', 'make',
  'sure', 'good', 'great', 'thanks', 'thank', 'okay', 'now', 'let', 'lets', 'move', 'next', 'also', 'more'
]);

/**
 * True when the interviewer's utterance is the candidate's answer spoken back as if by the candidate.
 * Quoting the candidate is normal ("You mentioned you added an index on the email field. How does it work?"),
 * so an echo needs a long verbatim copy AND the candidate's first-person voice, or a copy of most of the answer.
 */
function echoesAnswer(utterance, answer) {
  const words = s => String(s || '').toLowerCase().replace(/[^a-z0-9']+/g, ' ').trim().split(/\s+/).filter(Boolean);
  const said = words(utterance);
  const heard = words(answer);
  if (said.length < 8 || heard.length < 8) return false;
  // Longest run of consecutive words shared by both (dynamic programming over word positions)
  let longest = 0;
  let prev = new Array(heard.length + 1).fill(0);
  for (let i = 1; i <= said.length; i++) {
    const cur = new Array(heard.length + 1).fill(0);
    for (let j = 1; j <= heard.length; j++) {
      if (said[i - 1] === heard[j - 1]) {
        cur[j] = prev[j - 1] + 1;
        if (cur[j] > longest) longest = cur[j];
      }
    }
    prev = cur;
  }
  // "Hi, I'm a final-year student", "I built ...", "My project ..." (but not the interviewer's "I see", "I'd like")
  const candidateVoice = /^\W*(?:(?:hi|hello|hey)\W+)?(?:i'm a|i am a|i built|i worked|i have|i've|i did|i used|i created|i developed|my )/i
    .test(String(utterance || ''));
  return longest >= 15 || (longest >= 8 && candidateVoice);
}

/**
 * followUp: a follow-up is meant to stay on the previous question's topic, so only a near-identical
 * question counts as a repeat (topic words alone are expected to overlap).
 */
function isDistinctQuestion(proposedQuestion, previousQuestions = [], { followUp = false } = {}) {
  if (!proposedQuestion || previousQuestions.length === 0) return true;
  // Only content words count: question scaffolding ("could you explain how you would ...") is shared by
  // almost every interview question and made genuinely new questions look like repeats.
  const tokens = s => new Set(String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/)
    .filter(w => w.length > 2 && !QUESTION_STOPWORDS.has(w)));
  const propTokens = tokens(proposedQuestion);
  if (propTokens.size === 0) return true;
  for (const prev of previousQuestions) {
    const prevTokens = tokens(prev);
    if (prevTokens.size === 0) continue;
    let matchCount = 0;
    for (const t of propTokens) if (prevTokens.has(t)) matchCount++;
    const overlap = matchCount / Math.min(propTokens.size, prevTokens.size);
    const jaccard = matchCount / Math.max(propTokens.size, prevTokens.size);
    if (jaccard >= 0.55 || (!followUp && overlap >= 0.7)) return false;
  }
  return true;
}

// Backwards-compatible facade used by older call sites
const InterviewStateMachine = { isDistinctQuestion };

module.exports = {
  echoesAnswer,
  PHASES,
  PHASE_ORDER,
  PHASE_PLANS,
  STRATEGIES,
  MAX_FOLLOW_UPS_PER_QUESTION,
  planFor,
  selectStrategy,
  advance,
  uiPhaseIndex,
  isDistinctQuestion,
  InterviewStateMachine
};
