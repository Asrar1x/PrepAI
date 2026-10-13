/**
 * PrepAI OpenAI-Compatible Provider
 * Supports OpenAI, DeepSeek, Groq, LM Studio, vLLM, and compatible servers.
 */
const AIProvider = require('./AIProvider');
const appConfig = require('../../config/env');

class OpenAICompatibleProvider extends AIProvider {
  constructor(config = {}) {
    super({
      providerName: 'openai',
      modelName: config.modelName || appConfig.ai.openaiModel,
      embeddingModel: config.embeddingModel || 'text-embedding-3-small',
      timeoutMs: config.timeoutMs || parseInt(process.env.AI_TIMEOUT_MS || '45000', 10)
    });
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY || '';
    this.baseUrl = (config.baseUrl || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  }

  async generateChat(messages, options = {}) {
    this.assertConfigured();
    const startTime = Date.now();
    const model = options.model || this.modelName;

    const body = {
      model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      temperature: typeof options.temperature === 'number' ? options.temperature : 0.7,
      top_p: typeof options.top_p === 'number' ? options.top_p : 0.9,
      max_tokens: options.max_tokens || 2048
    };

    if (options.format === 'json') {
      body.response_format = { type: 'json_object' };
    }

    const headers = { 'Content-Type': 'application/json' };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.timeoutMs)
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenAI-compatible HTTP ${response.status}: ${errText}`);
      }

      const data = await response.json();
      const latencyMs = Date.now() - startTime;
      const text = data.choices?.[0]?.message?.content || '';

      return {
        text,
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0
        },
        latencyMs,
        provider: 'openai',
        model
      };
    } catch (err) {
      if (err.name === 'TimeoutError') {
        throw new Error(`OpenAI-compatible request timed out after ${this.timeoutMs}ms`);
      }
      throw err;
    }
  }

  async generateCompletion(prompt, options = {}) {
    return this.generateChat([{ role: 'user', content: prompt }], options);
  }

  async generateEmbedding(text) {
    if (!text) return [];

    const headers = { 'Content-Type': 'application/json' };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    try {
      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: this.embeddingModel,
          input: text
        }),
        signal: AbortSignal.timeout(this.timeoutMs)
      });

      if (response.ok) {
        const data = await response.json();
        return data.data?.[0]?.embedding || [];
      }
      return [];
    } catch (err) {
      console.warn(`[OpenAICompatibleProvider] Embedding error: ${err.message}`);
      return [];
    }
  }

  async checkHealth() {
    return {
      healthy: true,
      provider: 'openai',
      configured: !!this.apiKey || this.baseUrl.includes('localhost'),
      model: this.modelName
    };
  }
}

module.exports = OpenAICompatibleProvider;
