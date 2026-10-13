/**
 * Minimal persisted job queue (single worker). Jobs survive restarts: anything left `running`
 * when the process stopped is re-queued on boot. Foreground interview turns take priority —
 * the worker waits while a live turn is being generated so evaluation never adds turn latency.
 */
const Job = require('../models/Job');

const handlers = new Map();
let started = false;
let busy = false;
let activeForeground = 0;

function registerHandler(type, fn) {
  handlers.set(type, fn);
}

async function enqueue(type, payload = {}, { priority = 5, delayMs = 0, dedupeKey = null, maxAttempts = 3 } = {}) {
  if (dedupeKey) {
    const existing = await Job.findOne({ dedupeKey, status: { $in: ['queued', 'running'] } });
    if (existing) return existing;
  }
  return Job.create({ type, payload, priority, dedupeKey, maxAttempts, runAfter: new Date(Date.now() + delayMs) });
}

/** Wrap foreground (latency-sensitive) work so background jobs pause while it runs. */
async function foreground(fn) {
  activeForeground += 1;
  try {
    return await fn();
  } finally {
    activeForeground -= 1;
  }
}

async function tick() {
  if (busy || activeForeground > 0) return;
  busy = true;
  try {
    const job = await Job.findOneAndUpdate(
      { status: 'queued', runAfter: { $lte: new Date() }, type: { $in: Array.from(handlers.keys()) } },
      { $set: { status: 'running', startedAt: new Date() }, $inc: { attempts: 1 } },
      { sort: { priority: 1, createdAt: 1 }, new: true }
    );
    if (!job) return;
    try {
      await handlers.get(job.type)(job.payload, job);
      job.status = 'done';
      job.finishedAt = new Date();
      job.lastError = null;
    } catch (err) {
      if (err && err.code === 'JOB_DEFERRED') {
        // Not a failure: the handler asked to run later (does not use up an attempt)
        job.status = 'queued';
        job.attempts = Math.max(0, job.attempts - 1);
        job.runAfter = new Date(Date.now() + (err.delayMs || 15000));
        await job.save();
        return;
      }
      job.lastError = String(err && err.message ? err.message : err).slice(0, 500);
      if (job.attempts >= job.maxAttempts) {
        job.status = 'failed';
        job.finishedAt = new Date();
      } else {
        job.status = 'queued';
        job.runAfter = new Date(Date.now() + 5000 * job.attempts);
      }
      console.warn(`[JobQueue] ${job.type} attempt ${job.attempts} failed: ${job.lastError}`);
    }
    await job.save();
  } catch (err) {
    console.warn('[JobQueue] worker error:', err.message);
  } finally {
    busy = false;
  }
}

async function start({ intervalMs = 750 } = {}) {
  if (started) return;
  started = true;
  await Job.updateMany({ status: 'running' }, { $set: { status: 'queued' } });
  setInterval(() => { tick(); }, intervalMs).unref();
}

async function pendingCount(filter = {}) {
  return Job.countDocuments({ status: { $in: ['queued', 'running'] }, ...filter });
}

/** Thrown by a handler to re-queue its job after `delayMs` without counting an attempt. */
function deferJob(delayMs = 15000, reason = 'deferred') {
  const err = new Error(reason);
  err.code = 'JOB_DEFERRED';
  err.delayMs = delayMs;
  return err;
}

module.exports = { registerHandler, enqueue, foreground, start, tick, pendingCount, deferJob };
