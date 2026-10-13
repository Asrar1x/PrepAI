/**
 * Ollama local provider: chat generation, native streaming and embeddings.
 * Model ids come from configuration only.
 */
const AIProvider = require('./AIProvider');
const { stripReasoning } = require('./AIProvider');
const config = require('../../config/env');

class OllamaProvider extends AIProvider {
  constructor(opts = {}) {
    super({
      providerName: 'ollama',
      modelName: opts.modelName || (config.ai.provider === 'ollama' ? config.ai.model : (process.env.OLLAMA_MODEL || config.ai.model)),
      embeddingModel: opts.embeddingModel || config.embeddings.model,
      timeoutMs: opts.timeoutMs || config.ai.timeoutMs
    });
    this.baseUrl = (opts.baseUrl || config.ai.ollamaBaseUrl).replace(/\/$/, '');
  }

  buildBody(messages, options, stream) {
    const model = options.model || this.modelName;
    const body = {
      model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      stream,
      options: {
        temperature: typeof options.temperature === 'number' ? options.temperature : 0.7,
        top_p: typeof options.top_p === 'number' ? options.top_p : 0.9,
        num_predict: options.max_tokens || options.num_predict || 1024
      }
    };
    // PrepAI needs final answers, not chain-of-thought; reasoning models honour think:false
    body.think = false;
    if (options.format === 'json') body.format = 'json';
    return body;
  }

  async generateChat(messages, options = {}) {
    const startTime = Date.now();
    const body = this.buildBody(messages, options, false);
    let response;
    try {
      response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(options.timeoutMs || this.timeoutMs)
      });
    } catch (err) {
      if (err.name === 'TimeoutError') throw new Error(`Ollama request timed out after ${options.timeoutMs || this.timeoutMs}ms`);
      throw new Error(`Ollama unavailable: ${err.message}`);
    }

    if (!response.ok) {
      const errorText = await response.text();
      // Older Ollama builds reject the `think` field; retry once without it
      if (response.status === 400 && /think/i.test(errorText)) {
        delete body.think;
        const retry = await fetch(`${this.baseUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(options.timeoutMs || this.timeoutMs)
        });
        if (!retry.ok) throw new Error(`Ollama HTTP ${retry.status}: ${await retry.text()}`);
        response = retry;
      } else {
        throw new Error(`Ollama HTTP ${response.status}: ${errorText}`);
      }
    }

    const data = await response.json();
    return {
      text: stripReasoning(data.message?.content || ''),
      usage: {
        promptTokens: data.prompt_eval_count || 0,
        completionTokens: data.eval_count || 0,
        totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
      },
      latencyMs: Date.now() - startTime,
      provider: 'ollama',
      model: body.model
    };
  }

  async *stream(request = {}) {
    const messages = request.messages || [
      ...(request.system ? [{ role: 'system', content: request.system }] : []),
      { role: 'user', content: request.prompt || '' }
    ];
    const body = this.buildBody(messages, {
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      format: request.json ? 'json' : undefined,
      model: request.model
    }, true);
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.timeoutMs)
    });
    if (!response.ok || !response.body) {
      throw new Error(`Ollama HTTP ${response.status}: ${await response.text()}`);
    }
    const decoder = new TextDecoder();
    let buffer = '';
    for await (const chunk of response.body) {
      buffer += decoder.decode(chunk, { stream: true });
      let nl;
      while ((nl = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line) continue;
        const evt = JSON.parse(line);
        yield { text: evt.message?.content || '', done: Boolean(evt.done) };
      }
    }
  }

  async generateEmbedding(text) {
    const cleanText = String(text || '').trim();
    if (!cleanText) throw new Error('Cannot embed empty text');
    const response = await fetch(`${this.baseUrl}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.embeddingModel, input: cleanText }),
      signal: AbortSignal.timeout(30000)
    });
    if (!response.ok) {
      throw new Error(`Ollama embedding HTTP ${response.status}: ${await response.text()}`);
    }
    const data = await response.json();
    const vec = Array.isArray(data.embeddings) ? data.embeddings[0] : data.embedding;
    if (!Array.isArray(vec) || vec.length === 0) throw new Error('Ollama returned an empty embedding');
    return vec;
  }

  async checkHealth() {
    const start = Date.now();
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) {
        return { healthy: false, latencyMs: Date.now() - start, provider: 'ollama', error: `HTTP ${response.status}` };
      }
      const data = await response.json();
      const modelNames = (data.models || []).map(m => m.name);
      const has = name => modelNames.some(m => m === name || m === `${name}:latest` || m.split(':')[0] === name);
      return {
        healthy: has(this.modelName),
        latencyMs: Date.now() - start,
        provider: 'ollama',
        activeModel: this.modelName,
        activeModelFound: has(this.modelName),
        embeddingModel: this.embeddingModel,
        embeddingModelFound: has(this.embeddingModel),
        modelsAvailable: modelNames
      };
    } catch (err) {
      return { healthy: false, latencyMs: Date.now() - start, provider: 'ollama', error: err.message };
    }
  }
}

module.exports = OllamaProvider;
