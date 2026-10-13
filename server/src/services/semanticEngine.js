/**
 * Embedding signals (spec §6.1, §33 EMBEDDINGS).
 *   sim(A,B) = (A·B) / (‖A‖ ‖B‖)
 * Similarity is a supporting signal for relevance and concept coverage only — never correctness
 * by itself. When the embedding provider is unavailable the signal is reported as unavailable.
 */
const { providerFactory } = require('./providers/AIProviderFactory');

function cosineSimilarity(vecA, vecB) {
  if (!Array.isArray(vecA) || !Array.isArray(vecB) || vecA.length === 0 || vecA.length !== vecB.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  if (magnitude === 0) return 0;
  return Math.max(-1, Math.min(1, dot / magnitude));
}

/**
 * @returns {Promise<{available: boolean, model?: string, questionSimilarity?: number,
 *   referenceSimilarity?: number|null, conceptSimilarities?: Array<{concept: string, similarity: number}>,
 *   latencyMs?: number, reason?: string}>}
 */
async function computeEmbeddingSignals({ question, answer, referenceAnswer = '', concepts = [] }) {
  const texts = [answer, question];
  if (referenceAnswer) texts.push(referenceAnswer);
  texts.push(...concepts);
  const started = Date.now();
  try {
    const { vectors, model } = await providerFactory.embed('answer_embedding', texts);
    const [ansVec, qVec] = vectors;
    let idx = 2;
    const refVec = referenceAnswer ? vectors[idx++] : null;
    const conceptSimilarities = concepts.map(concept => ({
      concept,
      similarity: Number(cosineSimilarity(ansVec, vectors[idx++]).toFixed(4))
    }));
    return {
      available: true,
      model,
      questionSimilarity: Number(cosineSimilarity(ansVec, qVec).toFixed(4)),
      referenceSimilarity: refVec ? Number(cosineSimilarity(ansVec, refVec).toFixed(4)) : null,
      conceptSimilarities,
      latencyMs: Date.now() - started
    };
  } catch (err) {
    return { available: false, reason: err.message };
  }
}

module.exports = { cosineSimilarity, computeEmbeddingSignals };
