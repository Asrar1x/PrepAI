/**
 * PrepAI Anthropic Claude Provider
 * Connects to Anthropic API v1/messages.
 */
const AIProvider = require('./AIProvider');
const appConfig = require('../../config/env');

class AnthropicProvider extends AIProvider {
  constructor(config = {}) {
    super({
      providerName: 'anthropic',
      modelName: config.modelName || appConfig.ai.anthropicModel,
      embeddingModel: config.embeddingModel || 'voyage-2',
      timeoutMs: config.timeoutMs || parseInt(process.env.AI_TIMEOUT_MS || '45000', 10)
    });
    this.apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY || '';
    this.baseUrl = (config.baseUrl || 'https://api.anthropic.com').replace(/\/$/, '');
  }

  async generateChat(messages, options = {}) {
    this.assertConfigured();
    if (!this.apiKey) {
      throw new Error('Anthropic API key is not configured (ANTHROPIC_API_KEY)');
    }

    const startTime = Date.now();
    const model = options.model || this.modelName;

    // Extract system prompt if present
    let system = '';
    const formattedMessages = [];

    for (const m of messages) {
      if (m.role === 'system') {
        system += (system ? '\n\n' : '') + m.content;
      } else {
        formattedMessages.push({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content
        });
      }
    }

    // Anthropic requires messages to start with user
    if (formattedMessages.length === 0) {
      formattedMessages.push({ role: 'user', content: 'Begin evaluation.' });
    }

    const body = {
      model,
      messages: formattedMessages,
      max_tokens: options.max_tokens || 2048,
      temperature: typeof options.temperature === 'number' ? options.temperature : 0.7
    };

    if (system) {
      body.system = system;
    }

    try {
      const response = await fetch(`${this.baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.timeoutMs)
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Anthropic HTTP ${response.status}: ${errText}`);
      }

      const data = await response.json();
      const latencyMs = Date.now() - startTime;
      const text = (data.content || []).map(c => c.text || '').join('');

      return {
        text,
        usage: {
          promptTokens: data.usage?.input_tokens || 0,
          completionTokens: data.usage?.output_tokens || 0,
          totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
        },
        latencyMs,
        provider: 'anthropic',
        model
      };
    } catch (err) {
      if (err.name === 'TimeoutError') {
        throw new Error(`Anthropic request timed out after ${this.timeoutMs}ms`);
      }
      throw err;
    }
  }

  async generateCompletion(prompt, options = {}) {
    return this.generateChat([{ role: 'user', content: prompt }], options);
  }

  async generateEmbedding(text) {
    // Anthropic does not have native embeddings in v1/messages; Voyage is typically partnered.
    // Return empty array to allow deterministic/lexical fallback or local nomic embedding.
    return [];
  }

  async checkHealth() {
    return {
      healthy: !!this.apiKey,
      provider: 'anthropic',
      configured: !!this.apiKey,
      model: this.modelName
    };
  }
}

module.exports = AnthropicProvider;
