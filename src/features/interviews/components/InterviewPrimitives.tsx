import type { PropsWithChildren } from 'react';
import { CheckCircle2, CircleAlert, LoaderCircle, Mic, Radio } from 'lucide-react';
import type { ConnectionStatus, InterviewPhase } from '../types';

export function SignalLabel({ status, children }: PropsWithChildren<{ status: 'live' | 'good' | 'warning' | 'muted' }>) {
  const color = status === 'live' ? 'bg-rose-400' : status === 'good' ? 'bg-emerald-400' : status === 'warning' ? 'bg-amber-400' : 'bg-slate-400';
  return (
    <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.15em] text-slate-400">
      <span className={`h-2 w-2 ${color} ${status === 'live' ? 'animate-pulse' : ''}`} aria-hidden="true" />
      {children}
    </span>
  );
}

export function Waveform({ active = true, compact = false }: { active?: boolean; compact?: boolean }) {
  const bars = [24, 39, 61, 42, 76, 53, 87, 46, 65, 32, 55, 78, 41, 60, 35, 71, 48, 29, 58, 45, 72, 39, 63, 34];
  return (
    <div className={`flex items-center justify-center gap-1 ${compact ? 'h-8' : 'h-28'} overflow-hidden`} aria-label={active ? 'Audio waveform active' : 'Audio waveform paused'}>
      {bars.map((height, index) => (
        <span
          key={`${height}-${index}`}
          className={`w-1.5 rounded-full bg-gradient-to-b from-violet-300 via-indigo-400 to-indigo-600 ${active ? 'animate-pulse' : 'opacity-35'}`}
          style={{ height: `${compact ? Math.max(7, height * 0.34) : height}px`, animationDelay: `${index * 70}ms`, animationDuration: `${850 + (index % 4) * 120}ms` }}
        />
      ))}
    </div>
  );
}

export function PhaseRail({ phase }: { phase: InterviewPhase }) {
  const phases: Array<{ key: InterviewPhase; label: string }> = [
    { key: 'introduction', label: 'Opening' },
    { key: 'technical', label: 'Deep dive' },
    { key: 'reflection', label: 'Reflection' },
    { key: 'closing', label: 'Close' },
  ];
  const activeIndex = phases.findIndex((item) => item.key === phase);
  return (
    <ol className="grid grid-cols-4 gap-1" aria-label="Interview phases">
      {phases.map((item, index) => {
        const complete = index < activeIndex;
        const current = index === activeIndex;
        return <li key={item.key} className="min-w-0">
          <div className={`h-1 ${complete || current ? 'bg-indigo-400' : 'bg-slate-800'}`} />
          <span className={`mt-2 block truncate text-[10px] font-semibold uppercase tracking-[0.12em] ${current ? 'text-indigo-200' : 'text-slate-500'}`}>{item.label}</span>
        </li>;
      })}
    </ol>
  );
}

export function ConnectionBanner({ status, onReconnect, pending }: { status: ConnectionStatus; onReconnect: () => void; pending?: boolean }) {
  if (status === 'connected') {
    return <SignalLabel status="good"><Radio size={12} /> encrypted audio connected</SignalLabel>;
  }
  if (status === 'connecting' || status === 'reconnecting') {
    return <div className="inline-flex items-center gap-2 text-xs text-amber-200"><LoaderCircle size={14} className="animate-spin" /> Establishing a secure audio channel…</div>;
  }
  return <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-100"><CircleAlert size={16} /> Audio connection interrupted <button type="button" onClick={onReconnect} disabled={pending} className="min-h-9 border-b border-amber-200 font-semibold hover:text-white disabled:opacity-60">{pending ? 'Reconnecting…' : 'Reconnect'}</button></div>;
}

export function DeviceCheck({ state }: { state: 'idle' | 'checking' | 'ready' | 'blocked' }) {
  const content = state === 'ready'
    ? <><CheckCircle2 size={18} className="text-emerald-400" /> Microphone detected</>
    : state === 'blocked'
      ? <><CircleAlert size={18} className="text-amber-300" /> Continue in demo audio mode</>
      : state === 'checking'
        ? <><LoaderCircle size={18} className="animate-spin text-indigo-300" /> Checking your microphone</>
        : <><Mic size={18} className="text-indigo-300" /> Check microphone before joining</>;
  return <div className="flex min-h-12 items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-slate-200">{content}</div>;
}
