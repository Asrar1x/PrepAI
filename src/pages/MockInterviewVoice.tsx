import React, { useEffect, useRef, useState } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
  useVoiceAssistant,
  BarVisualizer,
  VoiceAssistantControlBar,
} from '@livekit/components-react';
import { Mic, MicOff, PhoneOff, Sparkles, AlertTriangle, Loader2, Settings, CheckCircle2 } from 'lucide-react';
import { apiClient } from '@/shared/api/client';
import { useNavigate, useSearchParams } from 'react-router-dom';
import '@livekit/components-styles';

type Phase = 'idle' | 'requesting' | 'connecting' | 'live' | 'ending' | 'done' | 'error';

interface VoiceStartResponse {
  session_id: string;
  livekit_room_name: string;
  livekit_token: string;
  livekit_url: string;
}

const PERSONA_LABEL: Record<string, string> = {
  friendly_tutor: 'Friendly Tutor',
  strict_tech_lead: 'Strict Tech Lead',
  hr_friendly: 'HR Friendly',
  bar_raiser: 'Bar Raiser',
};

export default function MockInterviewVoice() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialPersona = params.get('persona') || 'friendly_tutor';
  const initialType = params.get('type') || 'technical';
  const resumeId = params.get('resume_id') || undefined;
  const jobRole = params.get('role') || 'Software Engineer';
  const company = params.get('company') || undefined;

  const [phase, setPhase] = useState<Phase>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [persona, setPersona] = useState(initialPersona);
  const [interviewType, setInterviewType] = useState(initialType);
  const [livekit, setLivekit] = useState<VoiceStartResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const startSession = async () => {
    setPhase('requesting');
    setErrorMsg(null);
    try {
      const res = await apiClient.post('/voice/start', {
        job_role: jobRole,
        company_target: company,
        interview_type: interviewType,
        persona,
        resume_id: resumeId,
      });
      const data: VoiceStartResponse = res.data?.data ?? res.data;
      setSessionId(data.session_id);
      setLivekit(data);
      setPhase('connecting');
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e?.response?.data?.detail || 'Failed to start voice session');
      setPhase('error');
    }
  };

  const endSession = async (sid: string) => {
    if (!sid) return;
    setPhase('ending');
    try {
      await apiClient.post(`/voice/${sid}/end`);
      await apiClient.put('/users/me/xp', { points: 50 }).catch(() => undefined);
      setPhase('done');
      setTimeout(() => navigate(`/feedback/${sid}`), 1500);
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e?.response?.data?.detail || 'Failed to end session');
      setPhase('error');
    }
  };

  if (phase === 'idle' || phase === 'error') {
    return (
      <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
        <header className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-teal-100 text-teal-600">
            <Mic size={32} />
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900">AI Voice Mock Interview</h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Real-time spoken interview with the AI. Powered by Silero VAD, Deepgram Nova-3, Claude, and ElevenLabs.
          </p>
        </header>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 space-y-6">
          <h3 className="text-xl font-bold text-slate-900">Configure your session</h3>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Persona</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(PERSONA_LABEL).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setPersona(key)}
                  className={`px-4 py-3 rounded-lg border text-sm font-medium transition ${
                    persona === key
                      ? 'bg-teal-600 text-white border-teal-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-teal-400'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Interview type</label>
            <select
              value={interviewType}
              onChange={(e) => setInterviewType(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-white text-slate-700"
            >
              <option value="technical">Technical</option>
              <option value="hr">HR</option>
              <option value="behavioral">Behavioral</option>
              <option value="resume">Resume walkthrough</option>
              <option value="case">Case study</option>
            </select>
          </div>

          {errorMsg && (
            <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-lg text-sm">
              <AlertTriangle size={18} className="shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            onClick={startSession}
            className="w-full bg-teal-600 text-white font-bold text-lg py-4 rounded-xl hover:bg-teal-700 transition flex items-center justify-center gap-2 shadow-lg shadow-teal-200"
          >
            <Mic size={20} /> Start voice interview
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'requesting') {
    return (
      <Centered>
        <Loader2 className="animate-spin text-teal-600" size={48} />
        <p className="mt-4 text-slate-600">Allocating your interviewer…</p>
      </Centered>
    );
  }

  if (phase === 'done') {
    return (
      <Centered>
        <CheckCircle2 className="text-emerald-600" size={48} />
        <h2 className="mt-4 text-2xl font-bold text-slate-900">Interview complete</h2>
        <p className="mt-2 text-slate-600">Generating your feedback report…</p>
      </Centered>
    );
  }

  if (!livekit) {
    return <Centered><Loader2 className="animate-spin text-teal-600" size={48} /></Centered>;
  }

  return (
    <div className="absolute inset-0 bg-slate-900 z-50 flex flex-col pt-16">
      <div className="h-16 flex items-center justify-between px-6 bg-slate-900 absolute top-0 left-0 right-0 z-50 shadow-md">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${phase === 'live' ? 'bg-red-500 animate-pulse' : 'bg-amber-500'}`} />
          <span className="text-white font-medium">
            {phase === 'connecting' ? 'Connecting to interviewer…' : 'Interview in progress'}
          </span>
        </div>
        <span className="text-slate-400 text-sm">
          {PERSONA_LABEL[persona]} · {interviewType}
        </span>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-3xl">
          <LiveKitRoom
            serverUrl={livekit.livekit_url}
            token={livekit.livekit_token}
            connect={true}
            audio={true}
            video={false}
            onConnected={() => setPhase('live')}
            onDisconnected={() => {
              if (sessionId) endSession(sessionId);
            }}
            data-lk-theme="default"
            style={{ height: '60vh' }}
          >
            <RoomAudioRenderer />
            <InterviewerAvatar phase={phase} />
            <div className="mt-6 flex justify-center">
              <VoiceAssistantControlBar controls={{ leave: false }} />
            </div>
            <EndButton sessionId={sessionId!} onEnd={() => endSession(sessionId!)} />
          </LiveKitRoom>
        </div>
      </div>
    </div>
  );
}

function InterviewerAvatar({ phase }: { phase: Phase }) {
  const { localParticipant } = useLocalParticipant();
  const { state, audioTrack } = useVoiceAssistant();

  return (
    <div className="bg-slate-800 rounded-3xl border border-slate-700 p-8 flex flex-col items-center justify-center gap-6">
      <div className="relative">
        <div
          className={`absolute inset-0 bg-teal-500 rounded-full opacity-30 blur-2xl ${
            state === 'speaking' ? 'animate-ping' : ''
          }`}
        />
        <div className="w-40 h-40 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 border-4 border-slate-700 flex items-center justify-center relative z-10">
          <Sparkles size={56} className="text-white opacity-90" />
        </div>
      </div>
      <div className="text-center space-y-1">
        <h3 className="text-white text-lg font-bold">AI Interviewer</h3>
        <p className="text-slate-400 text-sm">
          {phase === 'connecting'
            ? 'Connecting…'
            : state === 'speaking'
            ? 'Speaking…'
            : state === 'listening'
            ? 'Listening…'
            : state === 'thinking'
            ? 'Thinking…'
            : 'Ready'}
        </p>
      </div>
      <div className="w-64 h-12 flex items-center justify-center">
        {audioTrack ? (
          <BarVisualizer state={state} trackRef={audioTrack} barCount={9} />
        ) : (
          <div className="flex items-center gap-1 text-slate-500 text-sm">
            <MicOff size={16} /> Mic idle
          </div>
        )}
      </div>
      <p className="text-slate-500 text-xs">
        You: {localParticipant?.identity ?? '…'}
      </p>
    </div>
  );
}

function EndButton({ sessionId, onEnd }: { sessionId: string; onEnd: () => void }) {
  return (
    <div className="mt-4 flex justify-center">
      <button
        onClick={onEnd}
        className="w-16 h-16 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg hover:bg-red-700 transition hover:scale-105"
        title="End interview"
        disabled={!sessionId}
      >
        <PhoneOff size={28} />
      </button>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-md mx-auto mt-24 text-center space-y-4">{children}</div>
  );
}
