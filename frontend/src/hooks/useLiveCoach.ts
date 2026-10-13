import { useEffect, useRef, useState } from 'react';
import type { FaceLandmarker, PoseLandmarker } from '@mediapipe/tasks-vision';
import { analyseFrame, CoachSmoother, faceBox, type CoachIssueId } from '../lib/liveCoach';

export type CoachStatus = 'off' | 'loading' | 'ready' | 'unavailable';

// Everything is served by this app (copied from node_modules / downloaded once): no CDN, works offline
const WASM_PATH = '/mediapipe/wasm';
const FACE_MODEL = '/mediapipe/models/face_landmarker.task';
const POSE_MODEL = '/mediapipe/models/pose_landmarker_lite.task';
const INTERVAL_MS = 250; // about 4 checks a second: smooth enough, light on the CPU/GPU

/**
 * Runs the live camera coach on the given video while `enabled` is true.
 * Returns the current (smoothed) issue ids; an empty list means everything looks right.
 */
export function useLiveCoach(videoRef: React.RefObject<HTMLVideoElement | null>, enabled: boolean) {
  const [status, setStatus] = useState<CoachStatus>('off');
  const [issues, setIssues] = useState<CoachIssueId[]>([]);
  const faceRef = useRef<FaceLandmarker | null>(null);
  const poseRef = useRef<PoseLandmarker | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    const smoother = new CoachSmoother();
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 48;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    let lastKey = '';
    let lastTs = 0;

    async function load() {
      setStatus('loading');
      try {
        const vision = await import('@mediapipe/tasks-vision');
        const files = await vision.FilesetResolver.forVisionTasks(WASM_PATH);
        const create = async <T,>(make: (delegate: 'GPU' | 'CPU') => Promise<T>) => {
          try { return await make('GPU'); } catch { return make('CPU'); }
        };
        const face = await create(delegate => vision.FaceLandmarker.createFromOptions(files, {
          baseOptions: { modelAssetPath: FACE_MODEL, delegate },
          runningMode: 'VIDEO',
          numFaces: 2,
          outputFaceBlendshapes: true,
        }));
        // Posture needs the body model; if it fails to load, face-based tips still work
        const pose = await create(delegate => vision.PoseLandmarker.createFromOptions(files, {
          baseOptions: { modelAssetPath: POSE_MODEL, delegate },
          runningMode: 'VIDEO',
          numPoses: 1,
        })).catch(() => null);
        if (cancelled) {
          face.close();
          pose?.close();
          return;
        }
        faceRef.current = face;
        poseRef.current = pose;
        setStatus('ready');
        timer = setInterval(tick, INTERVAL_MS);
      } catch (err) {
        console.warn('[Live coach] could not start:', err);
        if (!cancelled) setStatus('unavailable');
      }
    }

    function brightness(x0: number, y0: number, x1: number, y1: number) {
      if (!ctx) return undefined;
      const sx = Math.max(0, Math.floor(x0 * canvas.width));
      const sy = Math.max(0, Math.floor(y0 * canvas.height));
      const w = Math.max(1, Math.min(canvas.width - sx, Math.ceil((x1 - x0) * canvas.width)));
      const h = Math.max(1, Math.min(canvas.height - sy, Math.ceil((y1 - y0) * canvas.height)));
      const px = ctx.getImageData(sx, sy, w, h).data;
      let sum = 0;
      for (let i = 0; i < px.length; i += 4) sum += 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
      return sum / (px.length / 4);
    }

    function tick() {
      const video = videoRef.current;
      const face = faceRef.current;
      if (!video || !face || video.readyState < 2 || video.videoWidth === 0) return;
      // MediaPipe needs strictly increasing timestamps
      const ts = Math.max(performance.now(), lastTs + 1);
      lastTs = ts;
      try {
        const faces = face.detectForVideo(video, ts);
        const pose = poseRef.current ? poseRef.current.detectForVideo(video, ts) : null;
        const blend: Record<string, number> = {};
        faces.faceBlendshapes?.[0]?.categories.forEach(c => { blend[c.categoryName] = c.score; });

        let frameBrightness: number | undefined;
        let faceBrightness: number | undefined;
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          frameBrightness = brightness(0, 0, 1, 1);
          if (faces.faceLandmarks.length) {
            const b = faceBox(faces.faceLandmarks[0]);
            faceBrightness = brightness(b.minX, b.minY, b.maxX, b.maxY);
          }
        }

        const now = smoother.push(analyseFrame({
          faces: faces.faceLandmarks,
          blendshapes: blend,
          pose: pose?.landmarks?.[0] || null,
          frameBrightness,
          faceBrightness,
        }));
        const key = now.join(',');
        if (key !== lastKey) {
          lastKey = key;
          setIssues(now);
        }
      } catch (err) {
        console.warn('[Live coach] frame skipped:', err);
      }
    }

    load();
    return () => {
      cancelled = true;
      clearInterval(timer);
      faceRef.current?.close();
      poseRef.current?.close();
      faceRef.current = null;
      poseRef.current = null;
    };
  }, [enabled, videoRef]);

  // While disabled, report off and no tips (state from the last run is ignored)
  return enabled ? { status, issues } : { status: 'off' as CoachStatus, issues: [] as CoachIssueId[] };
}
