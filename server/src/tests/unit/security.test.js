require('./setup');
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { statusFor } = require('../../middleware/asyncErrors');
const { resolveVoice, escapeXml } = require('../../services/ttsService');

async function withServer(app, fn) {
  const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  try {
    return await fn(`http://127.0.0.1:${server.address().port}`);
  } finally {
    server.close();
  }
}

test('async route errors reach the error handler instead of crashing the process', async () => {
  const app = express();
  app.get('/boom', async () => { throw Object.assign(new Error('bad value'), { name: 'ValidationError' }); });
  app.get('/later', async () => { await new Promise(r => setTimeout(r, 5)); throw new Error('db down'); });
  app.get('/ok', async (req, res) => res.json({ ok: true }));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => res.status(statusFor(err)).json({ detail: err.message }));
  await withServer(app, async base => {
    assert.equal((await fetch(`${base}/boom`)).status, 400, 'validation errors are client errors');
    assert.equal((await fetch(`${base}/later`)).status, 500, 'rejections after an await are caught too');
    assert.equal((await fetch(`${base}/ok`)).status, 200);
  });
});

test('error status mapping: invalid input is 400, oversized body 413, the rest 500', () => {
  assert.equal(statusFor({ name: 'CastError' }), 400);
  assert.equal(statusFor({ type: 'entity.parse.failed' }), 400);
  assert.equal(statusFor({ type: 'entity.too.large' }), 413);
  assert.equal(statusFor({ status: 404 }), 404);
  assert.equal(statusFor(new Error('x')), 500);
});

test('evaluations: re-grading a turn replaces its earlier evaluation instead of duplicating it', async t => {
  const AnswerEvaluation = require('../../models/AnswerEvaluation');
  const EvaluationSignal = require('../../models/EvaluationSignal');
  const { saveEvaluation } = require('../../services/evaluationStore');
  const deletedEvals = [];
  const deletedSignals = [];
  t.mock.method(AnswerEvaluation, 'find', async () => [{ _id: 'old-1' }, { _id: 'old-2' }]);
  t.mock.method(AnswerEvaluation, 'deleteMany', async q => { deletedEvals.push(q); });
  t.mock.method(EvaluationSignal, 'deleteMany', async q => { deletedSignals.push(q); });
  t.mock.method(AnswerEvaluation, 'create', async doc => ({ ...doc, _id: 'new-1' }));
  t.mock.method(EvaluationSignal, 'insertMany', async () => []);
  const doc = await saveEvaluation({ status: 'failed', weights: {}, evaluatorVersion: 'eval-v4', signals: {} }, { turnId: 'turn-1' });
  assert.equal(doc._id, 'new-1');
  assert.deepEqual(deletedEvals[0], { _id: { $in: ['old-1', 'old-2'] } });
  assert.deepEqual(deletedSignals[0], { evaluationId: { $in: ['old-1', 'old-2'] } });
});

test('TTS: only known voices reach the speech request and text is XML-escaped', () => {
  assert.equal(resolveVoice('guy'), 'en-US-GuyNeural');
  assert.equal(resolveVoice('en-IN-NeerjaNeural'), 'en-IN-NeerjaNeural');
  assert.equal(resolveVoice('"><injected'), 'en-US-ChristopherNeural');
  assert.equal(resolveVoice(['guy']), 'en-US-ChristopherNeural');
  assert.equal(resolveVoice(undefined), 'en-US-ChristopherNeural');
  assert.equal(escapeXml('Is a < b & c > d?'), 'Is a &lt; b &amp; c &gt; d?');
  assert.equal(escapeXml('</prosody><voice name="x">'), '&lt;/prosody&gt;&lt;voice name=&quot;x&quot;&gt;');
});
