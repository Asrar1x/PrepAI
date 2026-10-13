/**
 * PrepAI Production Rate Limiter
 * 
 * Implements a memory-efficient Token Bucket algorithm with independent buckets
 * for authentication, AI dialogue, resume upload, and report generation.
 */

class TokenBucket {
  constructor(capacity, refillTokensPerSec) {
    this.capacity = capacity;
    this.refillRate = refillTokensPerSec;
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  refill() {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastRefill) / 1000;
    if (elapsedSeconds > 0) {
      this.tokens = Math.min(this.capacity, this.tokens + elapsedSeconds * this.refillRate);
      this.lastRefill = now;
    }
  }

  tryConsume(count = 1) {
    this.refill();
    if (this.tokens >= count) {
      this.tokens -= count;
      return true;
    }
    return false;
  }

  getRetryAfterSeconds() {
    this.refill();
    if (this.tokens >= 1) return 0;
    const needed = 1 - this.tokens;
    return Math.ceil(needed / this.refillRate);
  }
}

class RateLimiterRegistry {
  constructor() {
    this.buckets = new Map(); // key -> TokenBucket
    // Periodic garbage collection every 10 minutes for inactive buckets
    setInterval(() => this.cleanup(), 10 * 60 * 1000).unref();
  }

  getBucket(key, capacity, refillPerSec) {
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = new TokenBucket(capacity, refillPerSec);
      this.buckets.set(key, bucket);
    }
    return bucket;
  }

  cleanup() {
    const now = Date.now();
    for (const [key, bucket] of this.buckets.entries()) {
      if (now - bucket.lastRefill > 30 * 60 * 1000) {
        this.buckets.delete(key);
      }
    }
  }
}

const registry = new RateLimiterRegistry();

/**
 * Express middleware factory for token bucket rate limiting
 * @param {Object} options
 * @param {number} options.capacity - Maximum bucket burst capacity
 * @param {number} options.refillRate - Tokens refilled per second
 * @param {string} options.bucketName - Identifier for rate limit category
 */
function createRateLimiter({ capacity = 60, refillRate = 1, bucketName = 'general' }) {
  return function (req, res, next) {
    // Exclude health check and tests
    if (process.env.NODE_ENV === 'test' || req.path === '/api/v1/health') {
      return next();
    }

    const clientIdentifier = req.user ? req.user._id.toString() : (req.ip || req.connection.remoteAddress || 'unknown');
    const bucketKey = `${bucketName}:${clientIdentifier}`;

    const bucket = registry.getBucket(bucketKey, capacity, refillRate);

    if (bucket.tryConsume(1)) {
      res.setHeader('X-RateLimit-Limit', capacity);
      res.setHeader('X-RateLimit-Remaining', Math.floor(bucket.tokens));
      return next();
    }

    const retryAfter = bucket.getRetryAfterSeconds();
    res.setHeader('Retry-After', retryAfter);
    return res.status(429).json({
      detail: `Rate limit exceeded for ${bucketName}. Please retry after ${retryAfter} seconds.`,
      retryAfterSeconds: retryAfter
    });
  };
}

module.exports = {
  createRateLimiter,
  TokenBucket,
  // Pre-configured rate limiters
  authLimiter: createRateLimiter({ capacity: 10, refillRate: 0.2, bucketName: 'auth' }), // ~12 req/min
  aiLimiter: createRateLimiter({ capacity: 25, refillRate: 0.5, bucketName: 'ai_dialogue' }), // ~30 req/min
  uploadLimiter: createRateLimiter({ capacity: 10, refillRate: 0.2, bucketName: 'resume_upload' }),
  reportLimiter: createRateLimiter({ capacity: 20, refillRate: 0.4, bucketName: 'report_gen' }),
  apiLimiter: createRateLimiter({ capacity: 100, refillRate: 2, bucketName: 'general_api' })
};
