/**
 * One-off migration to the v4 data model.
 *  - TopicMastery: old 3-level difficulty names → Easy/Medium/Hard, band, source, new unique index.
 *  - Users: tokenVersion default.
 * Safe to run more than once.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../src/config/env');

const DIFFICULTY_MAP = { Foundational: 'Easy', Intermediate: 'Medium', 'Staff / Bar Raiser': 'Hard' };
const band = m => (m <= 30 ? 'Beginner' : m <= 50 ? 'Developing' : m <= 70 ? 'Intermediate' : m <= 85 ? 'Strong' : 'Advanced');

(async () => {
  await mongoose.connect(config.mongoUri);
  const db = mongoose.connection.db;
  const tm = db.collection('topicmasteries');

  const indexes = await tm.indexes().catch(() => []);
  for (const idx of indexes) {
    if (idx.name !== '_id_' && idx.unique && !idx.key.source) {
      await tm.dropIndex(idx.name);
      console.log('dropped index', idx.name);
    }
  }
  const docs = await tm.find({}).toArray();
  let migrated = 0;
  for (const d of docs) {
    const update = {};
    if (!d.source) update.source = 'interview';
    if (!d.difficulty) update.difficulty = DIFFICULTY_MAP[d.currentDifficulty] || 'Medium';
    if (!d.band) update.band = band(d.masteryScore || 0);
    if (!Array.isArray(d.recentResults)) update.recentResults = [];
    if (!Array.isArray(d.transitions)) update.transitions = [];
    if (Object.keys(update).length) {
      await tm.updateOne({ _id: d._id }, { $set: update, $unset: { currentDifficulty: '', consecutiveStrongAnswers: '', consecutiveWeakAnswers: '' } });
      migrated += 1;
    }
  }
  await tm.createIndex({ userId: 1, topic: 1, source: 1 }, { unique: true });
  const users = await db.collection('users').updateMany({ tokenVersion: { $exists: false } }, { $set: { tokenVersion: 0 } });
  console.log(`topic masteries migrated: ${migrated}/${docs.length}; users given tokenVersion: ${users.modifiedCount}`);
  // Earlier versions gave every new account two badges it never earned
  const badges = await db.collection('users').updateMany(
    { badges: { $in: ['First Step', 'Early Adopter'] } },
    { $pullAll: { badges: ['First Step', 'Early Adopter'] } }
  );
  console.log(`unearned placeholder badges removed from ${badges.modifiedCount} user(s)`);
  await mongoose.disconnect();
})().catch(err => { console.error(err); process.exit(1); });
