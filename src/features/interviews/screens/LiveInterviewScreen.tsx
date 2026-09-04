import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CornerDownLeft, Headphones, Mic, MicOff, PhoneOff, Send, Volume2 } from 'lucide-react';
import { ConnectionBanner, PhaseRail, SignalLabel, Waveform } from '../components/InterviewPrimitives';
import { useAppendTranscript, useEndInterview, useInterviewSession, useReconnectInterview } from '../queries';
import type { ConnectionStatus } from '../types';

function timeLabel(totalSeconds: number) {
  const minutes = Math.max(0, Math.floor(totalSeconds / 60));
  const seconds = Math.max(0, totalSeconds % 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function LiveInterviewScreen() {
  const { sessionId = 'demo-live' } = useParams();
  const navigate = useNavigate();
  const sessionQuery = useInterviewSession(sessionId);
  const reconnect = useReconnectInterview(sessionId);
  const appendTurn = useAppendTranscript(sessionId);
  const endInterview = useEndInterview(sessionId);
  const [muted, setMuted] = useState(false);
  const [mode, setMode] = useState<'auto' | 'push'>('auto');
  const [draft, setDraft] = useState('');
  const [connection, setConnection] = useState<ConnectionStatus>('connecting');
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  const session = sessionQuery.data;
  useEffect(() => {
    const timer = window.setTimeout(() => setConnection('connected'), 700);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!session) return;
    setSecondsLeft(session.configuration.durationMinutes * 60 - 84);
  }, [session?.id]);
  useEffect(() => {
    if (secondsLeft === null || secondsLeft <= 0) return;
    const timer = window.setInterval(() => setSecondsLeft((value) => value === null ? value : Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [secondsLeft]);

  const elapsedLabel = useMemo(() => timeLabel(secondsLeft ?? 0), [secondsLeft]);
  const leave = () => endInterview.mutate(undefined, { onSuccess: () => navigate(`/interviews/${sessionId}/processing`) });
  const sendResponse = () => {
    const text = draft.trim();
    if (!text) return;
    appendTurn.mutate({ id: `student-${Date.now()}`, speaker: 'student', text, timestamp: 'now' });
    setDraft('');
    window.setTimeout(() => appendTurn.mutate({ id: `ai-${Date.now()}`, speaker: 'interviewer', text: 'That is a useful direction. What failure mode would you prioritise next, and why?', timestamp: 'now' }), 900);
  };

  if (sessionQuery.isPending || !session) return <div className="grid min-h-screen place-items-center bg-[#0A0A0F]"><div className="h-9 w-9 animate-spin rounded-full border-2 border-indigo-300 border-t-transparent" /></div>;
  if (sessionQuery.isError) return <main className="grid min-h-screen place-items-center bg-[#0A0A0F] p-6 text-center text-white"><div><h1 className="text-2xl font-semibold">We lost the interview room.</h1><button onClick={() => sessionQuery.refetch()} className="mt-5 min-h-12 rounded-xl bg-indigo-500 px-5 font-semibold">Reconnect room</button></div></main>;

  return <main className="min-h-screen bg-[#0A0A0F] text-white">
    <header className="flex min-h-16 items-center justify-between gap-3 border-b border-white/10 px-4 sm:px-7"><div className="flex min-w-0 items-center gap-3"><span className="grid h-8 w-8 place-items-center border border-indigo-400/40 bg-indigo-400/10 text-indigo-200"><Headphones size={16} /></span><div className="min-w-0"><SignalLabel status="live">Practice room live</SignalLabel><p className="truncate text-sm font-semibold text-white">{session.configuration.company} · {session.configuration.targetRole}</p></div></div><div className="font-mono text-lg tabular-nums text-slate-200" aria-label={`${elapsedLabel} remaining`}>{elapsedLabel}</div><button onClick={leave} disabled={endInterview.isPending} className="min-h-10 rounded-lg border border-rose-400/30 px-3 text-xs font-semibold text-rose-200 hover:bg-rose-400/10 disabled:opacity-60">{endInterview.isPending ? 'Ending…' : 'End session'}</button></header>
    <div className="mx-auto grid max-w-[1600px] gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_370px] lg:p-6">
      <section className="relative min-h-[440px] overflow-hidden border border-white/10 bg-[#111118] p-6 sm:p-9">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400 to-transparent opacity-70" />
        <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="font-mono text-[11px] uppercase tracking-[0.16em] text-indigo-200">{session.interviewerTitle}</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">{session.interviewerName}</h1></div><ConnectionBanner status={connection} pending={reconnect.isPending} onReconnect={() => { setConnection('reconnecting'); reconnect.mutate(undefined, { onSuccess: () => setConnection('connected'), onError: () => setConnection('offline') }); }} /></div>
        <div className="mx-auto mt-12 grid max-w-xl place-items-center text-center"><div className="relative grid h-44 w-44 place-items-center border border-indigo-300/30 bg-[radial-gradient(circle_at_center,_rgba(99,102,241,.32),rgba(99,102,241,.05)_44%,transparent_70%)]"><div className="absolute inset-4 animate-ping border border-indigo-300/20" /><div className="grid h-24 w-24 place-items-center rounded-full bg-indigo-500 text-4xl font-semibold shadow-[0_0_65px_rgba(99,102,241,.55)]">M</div></div><Waveform active={!muted && connection === 'connected'} /><p className="max-w-md text-lg leading-8 text-slate-100">“What failure mode would you prioritise next, and why?”</p><p className="mt-3 text-sm text-slate-400">Take a moment. A clear assumption is a strong start.</p></div>
        <div className="absolute inset-x-6 bottom-6"><PhaseRail phase={session.phase} /></div>
      </section>
      <aside className="flex min-h-[440px] flex-col border border-white/10 bg-[#111118]">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4"><div><p className="text-sm font-semibold">Live transcript</p><p className="mt-0.5 text-xs text-slate-500">Visible only to you during practice</p></div><Volume2 size={17} className="text-indigo-300" /></div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">{session.transcript.map((turn) => <article key={turn.id} className={`border-l-2 px-3 py-1 ${turn.speaker === 'interviewer' ? 'border-indigo-400 bg-indigo-400/[0.04]' : 'border-emerald-400 bg-emerald-400/[0.035]'}`}><p className={`font-mono text-[10px] font-semibold uppercase tracking-[.14em] ${turn.speaker === 'interviewer' ? 'text-indigo-300' : 'text-emerald-300'}`}>{turn.speaker === 'interviewer' ? session.interviewerName : 'You'} · {turn.timestamp}</p><p className="mt-1 text-sm leading-6 text-slate-200">{turn.text}</p></article>)}</div>
        <div className="border-t border-white/10 p-4"><label className="sr-only" htmlFor="spoken-response">Practice response transcript</label><textarea id="spoken-response" value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) sendResponse(); }} placeholder="Type a practice response to advance the demo…" className="min-h-22 w-full resize-none border border-white/10 bg-black/20 p-3 text-sm text-white placeholder:text-slate-600 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20" /><button type="button" onClick={sendResponse} disabled={!draft.trim() || appendTurn.isPending} className="mt-2 inline-flex min-h-10 w-full items-center justify-center gap-2 bg-indigo-500 px-3 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50"><Send size={15} /> Send to transcript</button></div>
      </aside>
    </div>
    <footer className="sticky bottom-0 flex flex-wrap items-center justify-center gap-3 border-t border-white/10 bg-[#0A0A0F]/95 px-4 py-4 backdrop-blur"><button type="button" onClick={() => setMuted((value) => !value)} className={`inline-flex min-h-12 items-center gap-2 border px-4 text-sm font-semibold transition ${muted ? 'border-rose-400/50 bg-rose-400/10 text-rose-100' : 'border-white/15 bg-white/[0.05] text-white hover:bg-white/10'}`}>{muted ? <MicOff size={18} /> : <Mic size={18} />}{muted ? 'Microphone muted' : 'Microphone on'}</button><button type="button" onClick={() => setMode((value) => value === 'auto' ? 'push' : 'auto')} className="inline-flex min-h-12 items-center gap-2 border border-white/15 bg-white/[0.05] px-4 text-sm font-semibold text-white hover:bg-white/10"><CornerDownLeft size={17} /> {mode === 'auto' ? 'Auto listen' : 'Push to talk'}</button><button type="button" onClick={leave} className="inline-flex min-h-12 items-center gap-2 bg-rose-500 px-5 text-sm font-semibold text-white hover:bg-rose-400"><PhoneOff size={17} /> Finish & analyse</button></footer>
  </main>;
}
