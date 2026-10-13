/**
 * Central configuration. Every provider, model id, TTL and service URL is read here so
 * business logic never hardcodes a model name (spec §7.3, §31).
 */
require('dotenv').config();

const num = (v, d) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};
const list = (v, d) => (v ? String(v).split(',').map(s => s.trim()).filter(Boolean) : d);
const bool = (v, d) => (v === undefined || v === '' ? d : String(v).toLowerCase() !== 'false');

const APP_ENV = process.env.APP_ENV || process.env.NODE_ENV || 'development';
const DEFAULT_DEV_SECRET = 'prepai_jwt_secret_key_2026_super_secure';

const config = {
  appEnv: APP_ENV,
  isProduction: APP_ENV === 'production',
  port: num(process.env.PORT, 7857),
  mongoUri: process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://127.0.0.1:27017/prepai',
  corsOrigins: list(process.env.CORS_ORIGINS || process.env.APP_URL, [
    'http://localhost:5174',
    'http://127.0.0.1:5174',
    'http://localhost:5173',
    'http://127.0.0.1:5173'
  ]),

  auth: {
    jwtSecret: process.env.JWT_SECRET || DEFAULT_DEV_SECRET,
    accessTtlMinutes: num(process.env.JWT_ACCESS_TTL_MINUTES, 15),
    refreshTtlDays: num(process.env.JWT_REFRESH_TTL_DAYS, 30)
  },

  ai: {
    provider: (process.env.AI_PROVIDER || 'ollama').toLowerCase(),
    model: process.env.AI_MODEL || 'qwen3:8b',
    // Optional separate model for background grading (evaluation, reference packs, report prose).
    // Defaults to AI_MODEL; lets a slower, more accurate model grade while dialogue stays fast.
    evaluationModel: process.env.EVALUATION_MODEL || process.env.AI_MODEL || 'qwen3:8b',
    // Local vision model for the camera tutor (frame analysis after the interview)
    visionModel: process.env.VISION_MODEL || 'qwen2.5vl:3b',
    fallbackProvider: process.env.AI_FALLBACK_PROVIDER ? process.env.AI_FALLBACK_PROVIDER.toLowerCase() : null,
    timeoutMs: num(process.env.AI_TIMEOUT_MS, 90000),
    ollamaBaseUrl: (process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(/\/$/, ''),    anthropicModel: process.env.ANTHROPIC_MODEL || null,
    geminiModel: process.env.GEMINI_MODEL || null,
    openaiModel: process.env.OPENAI_MODEL || null
  },

  embeddings: {
    provider: (process.env.EMBEDDING_PROVIDER || 'ollama').toLowerCase(),
    model: process.env.EMBEDDING_MODEL || process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text'
  },

  laya: {
    enabled: bool(process.env.LAYA_ENABLED, true),
    model: process.env.LAYA_MODEL || 'convaiinnovations/laya',
    serviceUrl: (process.env.LAYA_SERVICE_URL || 'http://127.0.0.1:7860').replace(/\/$/, ''),
    // Laya runs on CPU here (~4 s per decision batch); keep the budget realistic
    timeoutMs: num(process.env.LAYA_TIMEOUT_MS, 30000),
    // Short budget used on the live interview turn path; on timeout the signal is recorded as unavailable
    turnTimeoutMs: num(process.env.LAYA_TURN_TIMEOUT_MS, 7000)
  },

  voice: {
    sttProvider: process.env.STT_PROVIDER || 'browser',
    sttModel: process.env.STT_MODEL || null,
    ttsProvider: process.env.TTS_PROVIDER || 'edge',
    ttsModel: process.env.TTS_MODEL || null
  },

  evaluation: {
    version: 'eval-v4',
    // Spec §9.1 default weights
    weights: {
      correctness: 0.25,
      relevance: 0.15,
      technicalDepth: 0.15,
      completeness: 0.15,
      reasoning: 0.10,
      clarity: 0.10,
      communication: 0.10
    }
  }
};

// Refuse to boot a production build with the development signing key
if (config.isProduction && config.auth.jwtSecret === DEFAULT_DEV_SECRET) {
  throw new Error('JWT_SECRET must be set to a private value in production');
}

module.exports = config;
