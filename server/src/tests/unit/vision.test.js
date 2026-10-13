require('./setup');
const test = require('node:test');
const assert = require('node:assert/strict');
const vision = require('../../services/visionService');

const frame = (seq, offsetSec, a) => ({ seq, offsetSec, status: 'analysed', model: 'qwen2.5vl:3b', analysis: {
  faceVisible: true, facing: 'camera', eyeLine: 'camera', posture: 'upright', framing: 'centered', lighting: 'good',
  attire: 'formal', attireNote: 'white collared shirt', background: 'clean', activities: [], fixes: [], ...a
} });

test('vision: model output is validated against the allowed values', () => {
  const ok = vision.normaliseFrameAnalysis({
    faceVisible: true, facing: 'Camera', eyeLine: 'down', posture: 'slouched', framing: 'centered', lighting: 'dim',
    attire: 'casual', attireNote: 'grey t-shirt', background: 'cluttered',
    activities: ['looking at phone', 'dancing'], fixes: ['Sit up straight.', '', 42]
  });
  assert.equal(ok.facing, 'camera');
  assert.deepEqual(ok.activities, ['looking at phone'], 'unknown activities are dropped');
  assert.deepEqual(ok.fixes, ['Sit up straight.']);
  assert.equal(vision.normaliseFrameAnalysis({ ...ok, posture: 'confident' }), null, 'non-observable labels are rejected');
  // Contradictions are dropped: someone looking straight at the camera is not reading notes
  const facing = vision.normaliseFrameAnalysis({ ...ok, facing: 'camera', eyeLine: 'camera', activities: ['reading notes', 'talking to someone off-camera', 'touching face'] });
  assert.deepEqual(facing.activities, ['touching face']);
  assert.equal(vision.normaliseFrameAnalysis(null), null);
});

test('vision: the tutor audit counts frames, builds a timeline and ranks fixes', () => {
  const frames = [
    frame(1, 5, {}),
    frame(2, 15, { eyeLine: 'down', activities: ['looking at phone'] }),
    frame(3, 25, { eyeLine: 'down', posture: 'slouched' }),
    frame(4, 35, { lighting: 'backlit' }),
    { seq: 5, offsetSec: 45, status: 'failed', analysis: null }
  ];
  const a = vision.buildVisualAudit(frames);
  assert.equal(a.framesCaptured, 5);
  assert.equal(a.framesAnalysed, 4);
  assert.equal(a.framesFailed, 1);
  const eye = a.attributes.find(x => x.key === 'eyeLine');
  assert.equal(eye.good, 2);
  assert.equal(eye.percent, 50);
  assert.equal(a.fixes[0].issue, 'Looking down instead of at the camera', 'most frequent issue first');
  assert.equal(a.fixes[0].frames, 2);
  assert.ok(a.fixes.some(f => /phone/i.test(f.fix)));
  assert.deepEqual(a.timeline.map(t => t.at), ['00:15', '00:25', '00:35']);
  assert.match(a.attire.verdict, /Formal attire/);
  assert.match(vision.auditSummary(a), /4 frames/);
});

test('vision: no frames means no audit; frames that all failed are reported, not invented', () => {
  assert.equal(vision.buildVisualAudit([]), null);
  const a = vision.buildVisualAudit([{ seq: 1, status: 'failed', analysis: null }]);
  assert.equal(a.unavailable, true);
  assert.equal(a.framesAnalysed, 0);
});
