/**
 * PrepAI Google Gemini Provider
 * Connects to Google Generative AI API (v1beta/models/...:generateContent).
 */
const AIProvider = require('./AIProvider');
const appConfig = require('../../config/env');

class GeminiProvider extends AIProvider {
  constructor(config = {}) {
    super({
      providerName: 'gemini',
      modelName: config.modelName || appConfig.ai.geminiModel,
      embeddingModel: config.embeddingModel || 'text-embedding-004',
      timeoutMs: config.timeoutMs || parseInt(process.env.AI_TIMEOUT_MS || '45000', 10)
    });
    this.apiKey = config.apiKey || process.env.GEMINI_API_KEY || '';
    this.baseUrl = (config.baseUrl || 'https://generativelanguage.googleapis.com').replace(/\/$/, '');
  }

  async generateChat(messages, options = {}) {
    this.assertConfigured();
    if (!this.apiKey) {
      throw new Error('Gemini API key is not configured (GEMINI_API_KEY)');
    }

    const startTime = Date.now();
    const model = options.model || this.modelName;

    // Convert messages to Gemini contents structure
    const contents = [];
    let systemInstruction = null;

    for (const m of messages) {
      if (m.role === 'system') {
        systemInstruction = { parts: [{ text: m.content }] };
      } else {
        contents.push({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }]
        });
      }
    }

    const body = {
      contents,
      generationConfig: {
        temperature: typeof options.temperature === 'number' ? options.temperature : 0.7,
        topP: typeof options.top_p === 'number' ? options.top_p : 0.9,
        maxOutputTokens: options.max_tokens || 2048
      }
    };

    if (systemInstruction) {
      body.systemInstruction = systemInstruction;
    }

    if (options.format === 'json') {
      body.generationConfig.responseMimeType = 'application/json';
    }

    try {
      const url = `${this.baseUrl}/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.timeoutMs)
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini HTTP ${response.status}: ${errText}`);
      }

      const data = await response.json();
      const latencyMs = Date.now() - startTime;
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const usage = data.usageMetadata ? {
        promptTokens: data.usageMetadata.promptTokenCount || 0,
        completionTokens: data.usageMetadata.candidatesTokenCount || 0,
        totalTokens: data.usageMetadata.totalTokenCount || 0
      } : undefined;

      return {
        text,
        usage,
        latencyMs,
        provider: 'gemini',
        model
      };
    } catch (err) {
      if (err.name === 'TimeoutError') {
        throw new Error(`Gemini request timed out after ${this.timeoutMs}ms`);
      }
      throw err;
    }
  }

  async generateCompletion(prompt, options = {}) {
    return this.generateChat([{ role: 'user', content: prompt }], options);
  }

  async generateEmbedding(text) {
    if (!this.apiKey || !text) return [];

    try {
      const url = `${this.baseUrl}/v1beta/models/${this.embeddingModel}:embedContent?key=${this.apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: `models/${this.embeddingModel}`,
          content: { parts: [{ text }] }
        }),
        signal: AbortSignal.timeout(this.timeoutMs)
      });

      if (response.ok) {
        const data = await response.json();
        return data.embedding?.values || [];
      }
      return [];
    } catch (err) {
      console.warn(`[GeminiProvider] Embedding error: ${err.message}`);
      return [];
    }
  }

  async checkHealth() {
    return {
      healthy: !!this.apiKey,
      provider: 'gemini',
      configured: !!this.apiKey,
      model: this.modelName
    };
  }
}

module.exports = GeminiProvider;
