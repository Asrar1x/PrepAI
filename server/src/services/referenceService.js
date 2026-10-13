/**
 * Builds the reference pack (expected/required concepts, common mistakes, reference answer)
 * used to grade an interview answer (spec §9, §33 REFERENCE-CONCEPT EVALUATION).
 */
const config = require('../config/env');
const { providerFactory } = require('./providers/AIProviderFactory');
const { renderPrompt } = require('../prompts');
const { parseModelJson } = require('./jsonOutput');

function normaliseReference(parsed) {
  if (!parsed || typeof parsed !== 'object') return null;
  const strings = (arr, max) => (Array.isArray(arr) ? arr.filter(s => typeof s === 'string' && s.trim()).map(s => s.trim()).slice(0, max) : []);
  const expectedConcepts = strings(parsed.expectedConcepts, 6);
  if (expectedConcepts.length < 2 || typeof parsed.referenceAnswer !== 'string' || parsed.referenceAnswer.trim().length < 20) return null;
  return {
    expectedConcepts,
    requiredConcepts: strings(parsed.requiredConcepts, 3).filter(c => expectedConcepts.some(e => e.toLowerCase() === c.toLowerCase())),
    commonMistakes: strings(parsed.commonMistakes, 3),
    referenceAnswer: parsed.referenceAnswer.trim()
  };
}

async function buildReferencePack({ question, topic, difficulty, role }) {
  const prompt = renderPrompt('question_reference');
  let normalised = null;
  const result = await providerFactory.execute('question_reference', provider => provider.generate({
    system: prompt.text,
    prompt: `Role: ${role || 'Software Engineer'}\nTopic: ${topic || 'General'}\nDifficulty: ${difficulty || 'Medium'}\nInterview question: ${question}`,
    temperature: 0.2,
    maxTokens: 600,
    json: true,
    model: config.ai.evaluationModel
  }), {
    maxRetries: 1,
    validate: res => {
      normalised = normaliseReference(parseModelJson(res.text));
      return normalised !== null;
    }
  });
  return { ...normalised, promptVersion: prompt.version, model: result.model };
}

module.exports = { buildReferencePack, normaliseReference };
