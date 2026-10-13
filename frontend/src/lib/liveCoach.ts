/**
 * Live camera coach: turns face and body landmarks (from MediaPipe, run in the browser) into
 * plain posture and framing tips while the student is being interviewed. Pure functions only,
 * so every rule can be unit-tested without a camera.
 *
 * Coordinates are MediaPipe's normalised image coordinates of the raw (un-mirrored) camera frame:
 * x 0 = left edge of the image, y 0 = top.
 */

export interface Point { x: number; y: number; z?: number; visibility?: number }

export interface CoachFrame {
  /** Landmarks of every face found (478 points each). */
  faces: Point[][];
  /** Blendshape scores of the first face, e.g. eyeLookDownLeft. */
  blendshapes?: Record<string, number>;
  /** Pose landmarks of the person (33 points), if detected. */
  pose?: Point[] | null;
  /** Average brightness 0-255 of the whole frame and of the face area. */
  frameBrightness?: number;
  faceBrightness?: number;
}

export type CoachIssueId =
  | 'no-face' | 'multiple-faces' | 'too-dark' | 'backlit' | 'too-close' | 'too-far'
  | 'move-left' | 'move-right' | 'face-low' | 'looking-away' | 'looking-down' | 'head-tilt'
  | 'shoulders-hidden' | 'shoulders-uneven' | 'slouching' | 'hands-near-face';

export interface CoachIssue { id: CoachIssueId; text: string }

/** Ordered by importance: the first ones shown are the ones that matter most in a real interview. */
export const COACH_TIPS: Record<CoachIssueId, string> = {
  'no-face': 'We cannot see your face. Move into the frame and face the camera.',
  'multiple-faces': 'Someone else is in view. Sit alone, as you would in a real interview.',
  'too-dark': 'Your face is too dark. Turn on a light in front of you.',
  backlit: 'Bright light behind you is darkening your face. Face the window or put the light in front of you.',
  'too-close': 'You are too close to the camera. Sit back a little.',
  'too-far': 'You are too far from the camera. Move a little closer.',
  'move-left': 'Move a little to your left so you are in the centre.',
  'move-right': 'Move a little to your right so you are in the centre.',
  'face-low': 'Your face is low in the frame. Raise the laptop or sit up so your eyes are near the top third.',
  'looking-away': 'Look at the camera, not to the side.',
  'looking-down': 'Look up at the camera instead of down.',
  'head-tilt': 'Keep your head straight, not tilted.',
  'shoulders-hidden': 'Sit back a little so your shoulders are visible.',
  'shoulders-uneven': 'Level your shoulders and sit square to the camera.',
  slouching: 'Sit up straight: lift your chest and keep your back against the chair.',
  'hands-near-face': 'Keep your hands away from your face.',
};
const ORDER = Object.keys(COACH_TIPS) as CoachIssueId[];

// Face mesh landmark indices
const NOSE_TIP = 1;
const LEFT_EYE_OUTER = 33;   // image-left eye corner
const RIGHT_EYE_OUTER = 263; // image-right eye corner
const UPPER_LIP = 13;
const CHEEK_A = 234;
const CHEEK_B = 454;
// Pose landmark indices
const P_SHOULDER_A = 11;
const P_SHOULDER_B = 12;
const P_HANDS = [15, 16, 17, 18, 19, 20];

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const visible = (p?: Point) => !!p && (p.visibility === undefined || p.visibility > 0.5) && p.x > 0 && p.x < 1 && p.y > 0 && p.y < 1;

export function faceBox(face: Point[]) {
  let minX = 1, minY = 1, maxX = 0, maxY = 0;
  for (const p of face) {
    if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}

/** Problems visible in one frame (before smoothing). */
export function analyseFrame(frame: CoachFrame): CoachIssueId[] {
  const issues = new Set<CoachIssueId>();
  if (!frame.faces.length) return ['no-face'];
  if (frame.faces.length > 1) issues.add('multiple-faces');

  const face = frame.faces[0];
  const box = faceBox(face);

  // Light
  if (frame.faceBrightness !== undefined) {
    if (frame.faceBrightness < 55) issues.add('too-dark');
    if (frame.frameBrightness !== undefined && frame.frameBrightness - frame.faceBrightness > 45 && frame.frameBrightness > 120) {
      issues.add('backlit');
    }
  }

  // Distance: face width as a share of the frame width
  if (box.width > 0.5) issues.add('too-close');
  else if (box.width < 0.14) issues.add('too-far');

  // Centring. In the raw camera image the student's right side appears on the image left.
  if (box.cx < 0.33) issues.add('move-left');
  else if (box.cx > 0.67) issues.add('move-right');
  if (box.cy > 0.62) issues.add('face-low');

  // Head turned to the side: the nose is much closer to one cheek than the other
  const nose = face[NOSE_TIP];
  const cheekA = face[CHEEK_A];
  const cheekB = face[CHEEK_B];
  if (nose && cheekA && cheekB) {
    const a = dist(nose, cheekA);
    const b = dist(nose, cheekB);
    if (Math.min(a, b) / Math.max(a, b) < 0.55) issues.add('looking-away');
  }
  // Eyes turned to the side
  const bs = frame.blendshapes || {};
  const sideways = Math.max(
    ((bs.eyeLookOutLeft ?? 0) + (bs.eyeLookInRight ?? 0)) / 2,
    ((bs.eyeLookInLeft ?? 0) + (bs.eyeLookOutRight ?? 0)) / 2
  );
  if (sideways > 0.55) issues.add('looking-away');

  // Looking down: eyes lowered, or the nose drops towards the mouth as the head bends
  const eyeA = face[LEFT_EYE_OUTER];
  const eyeB = face[RIGHT_EYE_OUTER];
  const lip = face[UPPER_LIP];
  const eyesDown = ((bs.eyeLookDownLeft ?? 0) + (bs.eyeLookDownRight ?? 0)) / 2;
  if (eyesDown > 0.55) issues.add('looking-down');
  if (eyeA && eyeB && nose && lip) {
    const eyeMidY = (eyeA.y + eyeB.y) / 2;
    const span = lip.y - eyeMidY;
    if (span > 0 && (nose.y - eyeMidY) / span > 0.82) issues.add('looking-down');
    // Head tilt: angle of the line through both outer eye corners
    const tilt = Math.abs(Math.atan2(eyeB.y - eyeA.y, eyeB.x - eyeA.x) * 180 / Math.PI);
    if (Math.min(tilt, 180 - tilt) > 12) issues.add('head-tilt');
  }

  // Shoulders and posture from the body landmarks
  const pose = frame.pose;
  const sA = pose?.[P_SHOULDER_A];
  const sB = pose?.[P_SHOULDER_B];
  if (pose && visible(sA) && visible(sB) && sA && sB) {
    const width = dist(sA, sB);
    const slope = Math.abs(Math.atan2(sB.y - sA.y, sB.x - sA.x) * 180 / Math.PI);
    if (Math.min(slope, 180 - slope) > 9) issues.add('shoulders-uneven');
    // Upright: the head sits well above the shoulder line. Slouching drops it towards the shoulders.
    const shoulderY = (sA.y + sB.y) / 2;
    if (width > 0 && nose && (shoulderY - nose.y) / width < 0.38) issues.add('slouching');
  } else if (!issues.has('too-close') && box.cy < 0.55) {
    issues.add('shoulders-hidden');
  }

  // Hands at the face
  if (pose) {
    const pad = box.width * 0.15;
    const nearFace = P_HANDS.some(i => {
      const h = pose[i];
      return visible(h) && h && h.x > box.minX - pad && h.x < box.maxX + pad && h.y > box.minY - pad && h.y < box.maxY + pad;
    });
    if (nearFace) issues.add('hands-near-face');
  }

  return ORDER.filter(id => issues.has(id));
}

/**
 * Keeps tips steady: an issue is shown only when it appears in most of the recent frames,
 * so a single blink or quick glance does not flash a warning.
 */
export class CoachSmoother {
  private history: CoachIssueId[][] = [];
  constructor(private windowSize = 8, private threshold = 0.6) {}

  push(issues: CoachIssueId[]): CoachIssueId[] {
    this.history.push(issues);
    if (this.history.length > this.windowSize) this.history.shift();
    const needed = Math.ceil(this.history.length * this.threshold);
    const counts = new Map<CoachIssueId, number>();
    for (const frame of this.history) for (const id of frame) counts.set(id, (counts.get(id) || 0) + 1);
    return ORDER.filter(id => (counts.get(id) || 0) >= needed);
  }
}

export const toTips = (ids: CoachIssueId[], max = 2): CoachIssue[] => ids.slice(0, max).map(id => ({ id, text: COACH_TIPS[id] }));
