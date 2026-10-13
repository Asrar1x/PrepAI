/**
 * Indexes already-completed interviews into interview memory (RAG) so the next interview can use
 * them. Idempotent: sessions that already have memories are skipped.
 * Run with: node scripts/backfill_interview_memory.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../src/config/env');
const { backfill } = require('../src/services/interviewMemory');

(async () => {
  await mongoose.connect(config.mongoUri);
  const indexed = await backfill();
  console.log(`[memory] indexed ${indexed} completed interview(s)`);
  await mongoose.disconnect();
})().catch(err => {
  console.error(err);
  process.exit(1);
});
