/**
 * Study plans built from actual weaknesses (spec §15.1, §16, §21 study-plan routes).
 * Task selection, ordering and scheduling are deterministic; prose can optionally be
 * improved by the generative model but never changes which topics are chosen.
 */
const crypto = require('crypto');
const StudyPlan = require('../models/StudyPlan');
const TopicMastery = require('../models/TopicMastery');

const DAY = 86400000;

function itemId(topic, idx) {
  return crypto.createHash('sha1').update(`${topic}:${idx}:${Date.now()}`).digest('hex').slice(0, 12);
}

/**
 * @param {Array<{topic: string, score: number|null, missingConcepts?: string[], source?: string}>} weaknesses
 */
function buildItems(weaknesses, { days = 7 } = {}) {
  const sorted = [...weaknesses].sort((a, b) => (a.score ?? 50) - (b.score ?? 50));
  const items = [];
  sorted.slice(0, 5).forEach((w, idx) => {
    const concepts = (w.missingConcepts || []).slice(0, 3);
    const isAptitude = w.source === 'aptitude';
    items.push({
      itemId: itemId(w.topic, idx),
      topic: w.topic,
      description: isAptitude
        ? `Solve 10 ${w.topic} questions at your current level and review the solution of every wrong answer.`
        : concepts.length
          ? `Study ${concepts.join(', ')} for ${w.topic}, then explain each out loud in under 2 minutes.`
          : `Answer 2 ${w.topic} mock-interview questions out loud and compare with the reference answers in your report.`,
      reason: w.score === null || w.score === undefined ? 'Not practised yet' : `Current score ${Math.round(w.score)}%`,
      durationMinutes: isAptitude ? 20 : 30,
      priority: idx < 2 ? 'High' : 'Normal',
      dueDate: new Date(Date.now() + Math.min(days, idx + 1) * DAY),
      status: 'pending'
    });
  });
  return items;
}

async function createPlan(userId, { weaknesses, targetRole = null, source = 'performance', sourceId = null }) {
  const items = buildItems(weaknesses);
  if (!items.length) return null;
  await StudyPlan.updateMany({ userId, status: 'active' }, { $set: { status: 'archived' } });
  return StudyPlan.create({ userId, targetRole, source, sourceId, items });
}

/** Builds a plan from current topic mastery (weakest first). */
async function generateFromMastery(userId, targetRole = null) {
  const mastery = await TopicMastery.find({ userId }).sort({ masteryScore: 1 }).limit(5);
  const weaknesses = mastery.map(m => ({ topic: m.topic, score: m.masteryScore, missingConcepts: m.weaknesses, source: m.source }));
  return createPlan(userId, { weaknesses, targetRole, source: 'performance' });
}

async function getActivePlan(userId) {
  return StudyPlan.findOne({ userId, status: 'active' }).sort({ createdAt: -1 });
}

async function setItemStatus(userId, itemIdValue, done) {
  const plan = await StudyPlan.findOne({ userId, status: 'active', 'items.itemId': itemIdValue });
  if (!plan) return null;
  const item = plan.items.find(i => i.itemId === itemIdValue);
  item.status = done ? 'done' : 'pending';
  item.completedAt = done ? new Date() : null;
  await plan.save();
  return plan;
}

function serializePlan(plan) {
  if (!plan) return null;
  const items = plan.items.map(i => ({
    id: i.itemId,
    topic: i.topic,
    description: i.description,
    reason: i.reason,
    durationMinutes: i.durationMinutes,
    priority: i.priority,
    dueDate: i.dueDate,
    isCompleted: i.status === 'done',
    status: i.status
  }));
  const done = items.filter(i => i.isCompleted).length;
  return {
    id: plan._id.toString(),
    targetRole: plan.targetRole,
    source: plan.source,
    createdAt: plan.createdAt,
    items,
    progressPercentage: items.length ? Math.round((done / items.length) * 100) : 0
  };
}

module.exports = { buildItems, createPlan, generateFromMastery, getActivePlan, setItemStatus, serializePlan };
