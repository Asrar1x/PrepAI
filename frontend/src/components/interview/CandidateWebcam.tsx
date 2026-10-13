import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Eye,
  Camera,
  Volume2
} from '../icons';
import toast from 'react-hot-toast';
import { interviewApi } from '../../api/interview';
import { useLiveCoach } from '../../hooks/useLiveCoach';
import { toTips } from '../../lib/liveCoach';

export interface CandidateSnapshotEvidence {
  id: string;
  timestamp: string;
  dataUrl: string;
}

// Text drawn over the video keeps fixed light colours: the light-theme rules would otherwise darken it
const VIDEO_LABEL_STYLE: React.CSSProperties = { color: 'rgba(255, 255, 255, 0.9)', backgroundColor: 'rgba(0, 0, 0, 0.55)' };
const COACH_TIP_STYLE: React.CSSProperties = { color: '#FFFFFF', backgroundColor: 'rgba(180, 83, 9, 0.92)' };
const COACH_GOOD_STYLE: React.CSSProperties = { color: '#FFFFFF', backgroundColor: 'rgba(4, 120, 87, 0.9)' };

type CameraStatus = 'starting' | 'live' | 'no-picture' | 'denied' | 'busy' | 'missing' | 'ended' | 'unsupported' | 'error' | 'off';

// Plain instructions for every way the camera can fail, so a black box is never left unexplained
const CAMERA_HELP: Partial<Record<CameraStatus, { title: string; text: string }>> = {
  denied: {
    title: 'Camera access is blocked for this site',
    text: 'Click the lock or camera icon at the left or right end of the address bar, set Camera to Allow, then press Try again.'
  },
  busy: {
    title: 'Another app is using your camera',
    text: 'Close the Camera app, Teams, Zoom, WhatsApp, Discord or any other tab using the camera, then press Try again.'
  },
  missing: {
    title: 'No camera was found',
    text: 'Connect a webcam or check that the built-in camera is turned on in Windows settings, then press Try again.'
  },
  'no-picture': {
    title: 'The camera opened but is not sending a picture',
    text: 'Slide open the camera privacy shutter, or press the camera on/off key on your keyboard (on many Lenovo laptops it is F8), then press Try again.'
  },
  ended: {
    title: 'The camera was disconnected',
    text: 'Reconnect it or close the app that took it over, then press Try again.'
  },
  unsupported: {
    title: 'This browser cannot use the camera here',
    text: 'Open PrepAI in Chrome or Edge at http://localhost:5174.'
  },
  error: {
    title: 'The camera could not start',
    text: 'Reload the page or restart the browser, then press Try again.'
  }
};

interface CandidateWebcamProps {
  sessionId?: string;
  candidateName?: string;
  isMicMuted: boolean;
  onToggleMic: () => void;
  isStudentSpeaking: boolean;
  isAISpeaking?: boolean;
  interviewerName?: string;
  audioFreqBars?: number[];
}

export const CandidateWebcam: React.FC<CandidateWebcamProps> = ({
  sessionId = 'latest',
  candidateName = 'You',
  isMicMuted,
  onToggleMic,
  isStudentSpeaking,
  isAISpeaking = false,
  interviewerName = 'Interviewer',
  audioFreqBars = []
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isCameraActive, setIsCameraActive] = useState<boolean>(true);
  // What the camera is really doing, so a black box is never shown without an explanation
  const [camStatus, setCamStatus] = useState<CameraStatus>('starting');
  const [slowStart, setSlowStart] = useState(false);
  const [darkPicture, setDarkPicture] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [isMirrored, setIsMirrored] = useState<boolean>(true);

  // Frames sent to the server for the camera feedback in the report
  const [capturedCount, setCapturedCount] = useState<number>(0);

  // Live coach runs only while real video is coming through
  const coach = useLiveCoach(videoRef, isCameraActive && camStatus === 'live');
  const coachTips = toTips(coach.issues);

  // Attaches the live stream to whichever <video> element is mounted, including one created after the stream started
  const attachVideo = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el && streamRef.current && el.srcObject !== streamRef.current) {
      el.srcObject = streamRef.current;
      el.play().catch(() => { /* muted autoplay; play() only fails if the element is being removed */ });
    }
  }, []);

  // Start Camera Stream
  useEffect(() => {
    let active = true;
    let slowTimer: ReturnType<typeof setTimeout> | undefined;
    let frameTimer: ReturnType<typeof setTimeout> | undefined;

    const stopStream = () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) videoRef.current.srcObject = null;
    };

    async function startCamera() {
      if (!isCameraActive) {
        stopStream();
        setCamStatus('off');
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setCamStatus('unsupported');
        return;
      }

      setCamStatus('starting');
      setSlowStart(false);
      setDarkPicture(false);
      // The browser may be waiting for the student to answer its permission prompt
      slowTimer = setTimeout(() => { if (active) setSlowStart(true); }, 3000);

      try {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
            audio: false
          });
        } catch (err) {
          // Some webcams reject the preferred size; any picture is better than none
          if ((err as DOMException)?.name !== 'OverconstrainedError') throw err;
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }
        clearTimeout(slowTimer);

        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        const track = stream.getVideoTracks()[0];
        if (track) track.onended = () => { if (active) setCamStatus('ended'); };
        if (videoRef.current) attachVideo(videoRef.current);

        // A camera can open and still send nothing (privacy shutter, camera key, driver problem)
        const waitForFrames = (triesLeft: number) => {
          if (!active) return;
          const v = videoRef.current;
          if (v && v.videoWidth > 0 && v.readyState >= 2) {
            setCamStatus('live');
            return;
          }
          if (triesLeft <= 0) {
            setCamStatus('no-picture');
            return;
          }
          frameTimer = setTimeout(() => waitForFrames(triesLeft - 1), 250);
        };
        waitForFrames(24);
      } catch (err) {
        clearTimeout(slowTimer);
        if (!active) return;
        const name = (err as DOMException)?.name || '';
        console.warn('[Candidate Webcam] Camera access error:', name, err);
        if (name === 'NotAllowedError' || name === 'SecurityError') setCamStatus('denied');
        else if (name === 'NotReadableError' || name === 'TrackStartError' || name === 'AbortError') setCamStatus('busy');
        else if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError') setCamStatus('missing');
        else setCamStatus('error');
      }
    }

    startCamera();

    return () => {
      active = false;
      clearTimeout(slowTimer);
      clearTimeout(frameTimer);
      stopStream();
    };
  }, [isCameraActive, retryKey, attachVideo]);

  // Small grey thumbnail of the previous frame, used to skip frames where nothing changed
  const lastThumbRef = useRef<Uint8ClampedArray | null>(null);
  const startedAtRef = useRef<number>(0);
  useEffect(() => {
    startedAtRef.current = Date.now();
  }, []);

  // Captures one webcam frame and sends it for the post-interview camera tutor analysis
  const captureEvidenceFrame = useCallback((force = false) => {
    if (!videoRef.current || !isCameraActive) return false;
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return false;

    try {
      // 640 px wide is enough for the vision model and keeps each frame small
      const scale = Math.min(1, 640 / video.videoWidth);
      const canvas = canvasRef.current || document.createElement('canvas');
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return false;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (isMirrored) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      // Skip near-identical frames (the student did not move) unless captured on request
      const thumbCanvas = document.createElement('canvas');
      thumbCanvas.width = 32;
      thumbCanvas.height = 24;
      const tctx = thumbCanvas.getContext('2d');
      if (tctx) {
        tctx.drawImage(canvas, 0, 0, 32, 24);
        const px = tctx.getImageData(0, 0, 32, 24).data;
        // A near-black picture usually means the privacy shutter is closed or the room is dark
        let brightness = 0;
        for (let i = 0; i < px.length; i += 4) brightness += (px[i] + px[i + 1] + px[i + 2]) / 3;
        setDarkPicture(brightness / (px.length / 4) < 12);
        const prev = lastThumbRef.current;
        if (prev && !force) {
          let diff = 0;
          for (let i = 0; i < px.length; i += 4) diff += Math.abs(px[i] - prev[i]);
          if (diff / (px.length / 4) < 6) return false;
        }
        lastThumbRef.current = px;
      }

      const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
      const offsetSec = Math.round((Date.now() - startedAtRef.current) / 1000);

      // Keep a few thumbnails in this tab for the report's gallery
      const storageKey = `interview_evidence_${sessionId}`;
      const existing: CandidateSnapshotEvidence[] = JSON.parse(sessionStorage.getItem(storageKey) || '[]');
      if (existing.length >= 6) existing.shift();
      const now = new Date();
      existing.push({
        id: `ev-${now.getTime()}`,
        timestamp: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`,
        dataUrl
      });
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(existing));
      } catch { /* storage full: the server copy is what matters */ }

      if (sessionId && sessionId !== 'latest') {
        interviewApi.uploadFrame(sessionId, dataUrl, offsetSec)
          .then(res => setCapturedCount(res.frames))
          .catch(() => { /* a missed frame only reduces the sample; the interview continues */ });
      }
      return true;
    } catch (e) {
      console.warn('Could not capture camera frame:', e);
      return false;
    }
  }, [isCameraActive, isMirrored, sessionId]);

  // Capture a frame every 10 seconds while the camera is on
  useEffect(() => {
    const interval = setInterval(() => {
      if (isCameraActive) captureEvidenceFrame();
    }, 10000);
    const initialTimer = setTimeout(() => {
      captureEvidenceFrame(true);
    }, 4000);

    return () => {
      clearInterval(interval);
      clearTimeout(initialTimer);
    };
  }, [isCameraActive, captureEvidenceFrame]);

  const toggleCamera = () => {
    if (isCameraActive) {
      setIsCameraActive(false);
      toast('Camera paused. Frames are not captured while it is off.');
    } else {
      setIsCameraActive(true);
      toast.success('Camera on. Frames are analysed after the interview ends.');
    }
  };

  const handleManualCapture = () => {
    if (captureEvidenceFrame(true)) toast.success('Frame captured for your camera feedback.');
    else if (!isCameraActive) toast.error('Turn the camera on to capture a frame.');
    else toast.error(CAMERA_HELP[camStatus]?.title || 'The camera is still starting. Try again in a moment.');
  };

  const retryCamera = () => {
    setIsCameraActive(true);
    setRetryKey((k) => k + 1);
  };

  const help = CAMERA_HELP[camStatus];
  const statusLabel = !isCameraActive ? 'Camera paused'
    : camStatus === 'live' ? 'Camera on'
    : camStatus === 'starting' ? 'Starting camera'
    : 'Camera problem';

  return (
    <div className="relative rounded-lg overflow-hidden bg-gray-950 border border-gray-800 shadow-2xl flex flex-col justify-between w-full h-[640px] select-none group">
      {/* Hidden canvas for taking snapshot evidence */}
      <canvas ref={canvasRef} className="hidden" />

      {/* 1. Top HUD Bar: Live Proctoring & Biometrics Status */}
      <div className="z-20 p-3 bg-[#1A1A19] border-b border-[#353532] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {/* Live Indicator */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-[#262624] border border-[#353532]" role="status">
            <span className={`w-2 h-2 rounded-full ${
              isCameraActive && camStatus === 'live' ? 'bg-emerald-400' : camStatus === 'starting' && isCameraActive ? 'bg-amber-400' : 'bg-rose-500'
            }`} />
            <span className="text-[11px] font-semibold text-gray-100">{statusLabel}</span>
          </div>

          <span className="text-white text-xs font-bold">
            {candidateName} (Candidate)
          </span>
        </div>

        {/* Frames go to the camera feedback in the report; they are not part of the interview score */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-[#262624] border border-[#353532] text-gray-300 text-[11px] font-semibold">
            <Eye className="w-3.5 h-3.5 text-gray-400" />
            <span>Frames reviewed after the interview</span>
          </div>
        </div>
      </div>

      {/* 2. Main Center Video Viewport with AI Vision HUD Overlay */}
      <div className="relative flex-1 flex items-center justify-center bg-gray-950 overflow-hidden">
        {isCameraActive ? (
          <>
            <video
              ref={attachVideo}
              autoPlay
              playsInline
              muted
              aria-label="Your camera"
              className={`w-full h-full object-cover transition-transform duration-300 ${
                isMirrored ? 'scale-x-[-1]' : ''
              }`}
            />

            {camStatus === 'live' && (
              /* Framing guide: where your head and shoulders should sit */
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-60 h-72 rounded-[45%] border border-white/25" />
                {coach.status !== 'ready' && (
                  /* Inline colours: this label sits on the video, which is dark in both themes */
                  <span className="absolute bottom-16 text-[11px] px-2 py-0.5 rounded" style={VIDEO_LABEL_STYLE}>
                    {darkPicture
                      ? 'Your picture is almost black: open the camera shutter or turn on a light'
                      : coach.status === 'loading'
                        ? 'Starting the live coach…'
                        : 'Keep your head and shoulders inside the outline'}
                  </span>
                )}
              </div>
            )}

            {camStatus === 'live' && coach.status === 'ready' && (
              /* Live coach: posture and framing tips worked out in this browser, several times a second */
              <div
                className="absolute bottom-4 left-4 right-4 flex flex-col items-start gap-1.5 pointer-events-none"
                aria-live="polite"
                data-testid="live-coach"
              >
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded" style={VIDEO_LABEL_STYLE}>Live coach</span>
                {coachTips.length === 0 ? (
                  <span className="text-xs font-medium px-2.5 py-1.5 rounded-md" style={COACH_GOOD_STYLE}>
                    Looking good: centred, upright and facing the camera.
                  </span>
                ) : (
                  coachTips.map(tip => (
                    <span key={tip.id} className="text-xs font-medium px-2.5 py-1.5 rounded-md max-w-full" style={COACH_TIP_STYLE}>
                      {tip.text}
                    </span>
                  ))
                )}
              </div>
            )}

            {camStatus === 'starting' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center bg-gray-950">
                <Video className="w-6 h-6 text-gray-400" />
                <p className="text-sm font-semibold text-gray-100">Starting your camera…</p>
                {slowStart && (
                  <p className="text-xs text-gray-300 max-w-sm leading-relaxed">
                    If your browser is asking for permission, click Allow. If you do not see a prompt, click the camera icon
                    in the address bar and choose Allow for this site.
                  </p>
                )}
              </div>
            )}

            {help && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center bg-gray-950" role="alert">
                <VideoOff className="w-6 h-6 text-rose-400" />
                <p className="text-sm font-semibold text-gray-100">{help.title}</p>
                <p className="text-xs text-gray-300 max-w-sm leading-relaxed">{help.text}</p>
                <button
                  type="button"
                  onClick={retryCamera}
                  className="mt-1 px-3 py-1.5 rounded-md bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold"
                >
                  Try again
                </button>
              </div>
            )}

            {/* Live Audio Equalizer Waveform overlay when Candidate Speaks */}
            {isStudentSpeaking && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-black/80 border border-brand-500/50 z-10">
                <span className="text-[11px] font-bold mr-2" style={{ color: '#BBCFF6' }}>
                  Speaking
                </span>
                {audioFreqBars.slice(0, 10).map((bar, i) => (
                  <span
                    key={i}
                    className="wave-bar w-1.5 bg-brand-500 rounded-full transition-all duration-75"
                    style={{ height: `${Math.max(4, Math.min(24, bar))}px`, animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </div>
            )}

            {/* When Interviewer is Speaking: Audio Broadcast Banner (No image needed!) */}
            {isAISpeaking && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center space-x-2.5 px-4 py-2 rounded-md bg-brand-950/90 border border-brand-500/60 z-20">
                <Volume2 className="w-4 h-4" style={{ color: '#8EAFEF' }} />
                <span className="text-xs font-bold" style={{ color: '#DCE6FB' }}>
                  {interviewerName} is speaking
                </span>
              </div>
            )}
          </>
        ) : (
          /* Privacy Camera Off Avatar Placeholder */
          <div className="flex flex-col items-center justify-center space-y-3 text-gray-400">
            <div className="w-20 h-20 rounded-full bg-gray-800 border-2 border-gray-700 flex items-center justify-center text-white font-black text-2xl shadow-inner">
              {candidateName.split(' ').map((n) => n[0]).slice(0, 2).join('') || 'ME'}
            </div>
            <div className="text-sm text-gray-400 font-medium flex items-center gap-2">
              <VideoOff className="w-4 h-4 text-rose-400" />
              <span>Camera paused. Click &quot;Start camera&quot; below to turn it back on.</span>
            </div>
          </div>
        )}
      </div>

      {/* 3. Bottom Telemetry Bar: Metrics & Controls */}
      <div className="z-20 p-3 bg-[#1A1A19] flex flex-wrap items-center justify-between border-t border-[#353532] gap-2">
        {/* Left: Device Controls */}
        <div className="flex items-center space-x-2">
          {/* Mic Button */}
          <button
            type="button"
            onClick={onToggleMic}
            className={`p-2 px-3 rounded-xl border flex items-center gap-2 text-xs font-semibold transition-all ${
              isMicMuted
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
            }`}
            title={isMicMuted ? 'Turn Microphone ON' : 'Mute Microphone'}
          >
            {isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-emerald-400" />}
            <span>{isMicMuted ? 'Mic Off' : 'Mic Active'}</span>
          </button>

          {/* Camera Button */}
          <button
            type="button"
            onClick={toggleCamera}
            className={`p-2 px-3 rounded-xl border flex items-center gap-2 text-xs font-semibold transition-all ${
              isCameraActive
                ? 'bg-gray-800 text-gray-200 border-gray-700 hover:bg-gray-700'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
            }`}
            title={isCameraActive ? 'Pause Camera' : 'Start Camera'}
          >
            {isCameraActive ? <Video className="w-4 h-4 text-emerald-400" /> : <VideoOff className="w-4 h-4" />}
            <span>{isCameraActive ? 'Pause camera' : 'Start camera'}</span>
          </button>

          {/* Flip Mirror */}
          <button
            type="button"
            onClick={() => setIsMirrored(!isMirrored)}
            className="p-2 px-2.5 rounded-xl bg-[#262624] hover:bg-[#30302E] border border-[#353532] text-gray-300 text-xs transition-colors"
            title="Mirror Video"
          >
            Flip
          </button>
        </div>

        {/* Right: AI Evidence Capture Counter & Trigger */}
        <div className="flex items-center space-x-2">
          <div className="text-[11px] text-gray-400 font-mono hidden sm:block">
            Evidence frames: <span className="text-emerald-400 font-bold">{capturedCount} captured</span>
          </div>

          <button
            type="button"
            onClick={handleManualCapture}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-brand-600/80 hover:bg-brand-600 text-white text-xs font-semibold transition-all shadow-md active:scale-95"
            title="Capture an instant visual evidence audit frame for the final report"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Audit Snapshot</span>
          </button>
        </div>
      </div>
    </div>
  );
};
