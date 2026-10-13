/**
 * One-off migration: spread the position of the correct option evenly over A–D for every
 * question in the bank (a fixed-letter guess must not score). Options are matched by text,
 * so completed sessions are unaffected; each changed question gets its version bumped.
 * Run with: node scripts/balance_option_positions.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../src/config/env');
const QuestionBank = require('../src/models/QuestionBank');
const { balanceOptionPositions, answersMatch } = require('../src/services/aptitudeService');

(async () => {
  await mongoose.connect(config.mongoUri);
  const questions = await QuestionBank.find({}).sort({ _id: 1 }).lean();
  const balanced = balanceOptionPositions(questions);
  let changed = 0;
  for (let i = 0; i < questions.length; i++) {
    if (JSON.stringify(questions[i].options) === JSON.stringify(balanced[i].options)) continue;
    await QuestionBank.updateOne({ _id: questions[i]._id }, { $set: { options: balanced[i].options }, $inc: { version: 1 } });
    changed += 1;
  }
  const positions = {};
  for (const q of balanced) {
    const idx = (q.options || []).findIndex(o => answersMatch(o, q.correctAnswer));
    const letter = idx >= 0 ? 'ABCD'[idx] : 'unmatched';
    positions[letter] = (positions[letter] || 0) + 1;
  }
  console.log(`[balance] ${changed}/${questions.length} questions reordered; correct-answer positions:`, positions);
  await mongoose.disconnect();
})().catch(err => {
  console.error(err);
  process.exit(1);
});
