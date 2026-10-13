import { describe, it, expect } from 'vitest';
import { analyseFrame, CoachSmoother, toTips, type Point, type CoachFrame } from '../lib/liveCoach';

/** A synthetic 478-point face: a box of the given size and centre, with the key landmarks placed frontally. */
function makeFace({ cx = 0.5, cy = 0.4, w = 0.25, tiltDeg = 0, yaw = 0, noseDrop = 0 } = {}): Point[] {
  const h = w * 1.3;
  const pts: Point[] = Array.from({ length: 478 }, (_, i) => ({
    x: cx - w / 2 + (i % 20) / 19 * w,
    y: cy - h / 2 + Math.floor(i / 20) / 23 * h,
  }));
  const rad = tiltDeg * Math.PI / 180;
  const eyeHalf = w * 0.3;
  pts[33] = { x: cx - eyeHalf * Math.cos(rad), y: cy - h * 0.1 - eyeHalf * Math.sin(rad) };
  pts[263] = { x: cx + eyeHalf * Math.cos(rad), y: cy - h * 0.1 + eyeHalf * Math.sin(rad) };
  pts[13] = { x: cx, y: cy + h * 0.25 };
  pts[1] = { x: cx + yaw * w, y: cy - h * 0.1 + (h * 0.35) * (0.55 + noseDrop) };
  pts[234] = { x: cx - w / 2, y: cy };
  pts[454] = { x: cx + w / 2, y: cy };
  return pts;
}

/** 33 pose points with shoulders below the face. */
function makePose({ cx = 0.5, shoulderY = 0.8, slopeY = 0, hand }: { cx?: number; shoulderY?: number; slopeY?: number; hand?: Point } = {}): Point[] {
  const pts: Point[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 1.2, visibility: 0.1 }));
  pts[11] = { x: cx + 0.18, y: shoulderY + slopeY, visibility: 0.99 };
  pts[12] = { x: cx - 0.18, y: shoulderY - slopeY, visibility: 0.99 };
  if (hand) pts[19] = { ...hand, visibility: 0.95 };
  return pts;
}

const good = (over: Partial<CoachFrame> = {}): CoachFrame => ({
  faces: [makeFace()],
  pose: makePose(),
  frameBrightness: 120,
  faceBrightness: 130,
  blendshapes: {},
  ...over,
});

describe('live coach', () => {
  it('a centred, upright, well-lit student gets no tips', () => {
    expect(analyseFrame(good())).toEqual([]);
  });

  it('no face and more than one face', () => {
    expect(analyseFrame(good({ faces: [] }))).toEqual(['no-face']);
    expect(analyseFrame(good({ faces: [makeFace(), makeFace({ cx: 0.8, w: 0.15 })] }))).toContain('multiple-faces');
  });

  it('distance and centring', () => {
    expect(analyseFrame(good({ faces: [makeFace({ w: 0.6 })] }))).toContain('too-close');
    expect(analyseFrame(good({ faces: [makeFace({ w: 0.1 })] }))).toContain('too-far');
    // The raw camera image is not mirrored: a face on the image left means the student sits to their right
    expect(analyseFrame(good({ faces: [makeFace({ cx: 0.2 })], pose: makePose({ cx: 0.2 }) }))).toContain('move-left');
    expect(analyseFrame(good({ faces: [makeFace({ cx: 0.8 })], pose: makePose({ cx: 0.8 }) }))).toContain('move-right');
    expect(analyseFrame(good({ faces: [makeFace({ cy: 0.7 })], pose: makePose({ shoulderY: 1.05 }) }))).toContain('face-low');
  });

  it('light: too dark and bright light behind', () => {
    expect(analyseFrame(good({ faceBrightness: 40, frameBrightness: 45 }))).toContain('too-dark');
    expect(analyseFrame(good({ faceBrightness: 110, frameBrightness: 200 }))).toContain('backlit');
  });

  it('head and eyes', () => {
    expect(analyseFrame(good({ faces: [makeFace({ tiltDeg: 20 })] }))).toContain('head-tilt');
    expect(analyseFrame(good({ faces: [makeFace({ yaw: 0.35 })] }))).toContain('looking-away');
    expect(analyseFrame(good({ blendshapes: { eyeLookOutLeft: 0.8, eyeLookInRight: 0.8 } }))).toContain('looking-away');
    expect(analyseFrame(good({ blendshapes: { eyeLookDownLeft: 0.8, eyeLookDownRight: 0.8 } }))).toContain('looking-down');
    expect(analyseFrame(good({ faces: [makeFace({ noseDrop: 0.4 })] }))).toContain('looking-down');
  });

  it('posture: uneven shoulders, slouching, hidden shoulders, hands at the face', () => {
    expect(analyseFrame(good({ pose: makePose({ slopeY: 0.05 }) }))).toContain('shoulders-uneven');
    expect(analyseFrame(good({ pose: makePose({ shoulderY: 0.48 }) }))).toContain('slouching');
    expect(analyseFrame(good({ pose: null }))).toContain('shoulders-hidden');
    expect(analyseFrame(good({ pose: makePose({ hand: { x: 0.5, y: 0.45 } }) }))).toContain('hands-near-face');
  });

  it('tips are ordered by importance and capped', () => {
    const ids = analyseFrame(good({ faces: [makeFace({ cx: 0.2, tiltDeg: 20 })], pose: null, faceBrightness: 40, frameBrightness: 45 }));
    expect(ids[0]).toBe('too-dark');
    expect(toTips(ids)).toHaveLength(2);
  });

  it('a single glance does not flash a tip, a lasting problem does', () => {
    const s = new CoachSmoother(8, 0.6);
    for (let i = 0; i < 7; i++) s.push([]);
    expect(s.push(['looking-down'])).toEqual([]);
    let shown: string[] = [];
    for (let i = 0; i < 5; i++) shown = s.push(['looking-down']);
    expect(shown).toEqual(['looking-down']);
  });
});
