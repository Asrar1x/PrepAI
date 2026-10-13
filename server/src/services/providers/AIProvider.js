/**
 * PrepAI generation provider contract (spec §7.3):
 *   healthCheck(), generate(request), stream(request), getModelInfo()
 * plus embed() for providers that also serve embeddings.
 *
 * Subclasses implement generateChat / generateEmbedding / checkHealth; the spec-level
 * methods below are expressed in terms of those so every provider exposes the same API.
 */
class AIProvider {
  constructor(config = {}) {
    if (new.target === AIProvider) {
      throw new TypeError('Cannot construct AIProvider instances directly');
    }
    this.providerName = config.providerName || 'unknown';
    this.modelName = config.modelName || null;
    this.embeddingModel = config.embeddingModel || null;
    this.timeoutMs = config.timeoutMs || 60000;
  }

  /** @returns {Promise<{text: string, usage?: object, latencyMs: number, provider: string, model: string}>} */
  async generateChat() {
    throw new Error('generateChat() must be implemented by subclass');
  }

  async generateCompletion(prompt, options = {}) {
    return this.generateChat([{ role: 'user', content: prompt }], options);
  }

  /** @returns {Promise<number[]>} */
  async generateEmbedding() {
    throw new Error(`${this.providerName} does not provide embeddings`);
  }

  /** @returns {Promise<{healthy: boolean, latencyMs: number}>} */
  async checkHealth() {
    throw new Error('checkHealth() must be implemented by subclass');
  }

  // ---- Spec-level interface -------------------------------------------------

  async healthCheck() {
    return this.checkHealth();
  }

  /**
   * @param {{messages?: Array<{role,content}>, system?: string, prompt?: string,
   *          temperature?: number, maxTokens?: number, json?: boolean, model?: string}} request
   */
  async generate(request = {}) {
    const messages = request.messages || [
      ...(request.system ? [{ role: 'system', content: request.system }] : []),
      { role: 'user', content: request.prompt || '' }
    ];
    return this.generateChat(messages, {
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      format: request.json ? 'json' : undefined,
      model: request.model
    });
  }

  /**
   * Default streaming implementation yields the full response as one chunk; providers with
   * native streaming (Ollama) override this.
   */
  async *stream(request = {}) {
    const res = await this.generate(request);
    yield { text: res.text, done: true };
  }

  async embed(input) {
    const items = Array.isArray(input) ? input : [input];
    const out = [];
    for (const item of items) out.push(await this.generateEmbedding(item));
    return out;
  }

  getModelInfo() {
    return {
      provider: this.providerName,
      model: this.modelName,
      embeddingModel: this.embeddingModel,
      timeoutMs: this.timeoutMs,
      configured: Boolean(this.modelName)
    };
  }

  // Backwards-compatible alias
  getModelMetadata() {
    return this.getModelInfo();
  }

  assertConfigured() {
    if (!this.modelName) {
      throw new Error(`${this.providerName} model is not configured`);
    }
  }
}

/**
 * Reasoning models (e.g. Qwen3) may emit <think>…</think> blocks; PrepAI only uses the final answer.
 */
function stripReasoning(text) {
  return String(text || '').replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/^[\s\S]*?<\/think>/i, '').trim();
}

module.exports = AIProvider;
module.exports.stripReasoning = stripReasoning;
