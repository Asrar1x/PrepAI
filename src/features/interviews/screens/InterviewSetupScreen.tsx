import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, FileText, Headphones, Mic, ShieldCheck, Sparkles } from 'lucide-react';
import { DeviceCheck, SignalLabel, Waveform } from '../components/InterviewPrimitives';
import { useCreateInterview, useInterviewSetup } from '../queries';
import type { CreateInterviewInput, InterviewDifficulty, InterviewKind } from '../types';
import { difficultyLabels, interviewKindLabels } from '../types';

type DeviceState = 'idle' | 'checking' | 'ready' | 'blocked';

export default function InterviewSetupScreen() {
  const navigate = useNavigate();
  const setupQuery = useInterviewSetup();
  const createInterview = useCreateInterview();
  const [deviceState, setDeviceState] = useState<DeviceState>('idle');
  const [form, setForm] = useState<CreateInterviewInput | null>(null);

  const configuration = useMemo(() => form ?? setupQuery.data?.defaultConfiguration ?? null, [form, setupQuery.data]);

  async function checkMicrophone() {
    setDeviceState('checking');
    try {
      const stream = await navigator.mediaDevices?.getUserMedia?.({ audio: true });
      stream?.getTracks().forEach((track) => track.stop());
      setDeviceState('ready');
    } catch {
      setDeviceState('blocked');
    }
  }

  if (setupQuery.isPending || !configuration) {
    return <div className="grid min-h-[65vh] place-items-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" aria-label="Loading interview setup" /></div>;
  }

  if (setupQuery.isError) {
    return <section className="mx-auto max-w-xl rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center"><h1 className="text-xl font-semibold text-rose-950">Interview setup is unavailable</h1><p className="mt-2 text-sm text-rose-700">Please refresh to load your preparation options.</p><button onClick={() => setupQuery.refetch()} className="mt-5 min-h-11 rounded-lg bg-rose-700 px-4 text-sm font-semibold text-white">Try again</button></section>;
  }

  const update = <K extends keyof CreateInterviewInput>(key: K, value: CreateInterviewInput[K]) => setForm({ ...configuration, [key]: value });
  const kinds = Object.keys(interviewKindLabels) as InterviewKind[];
  const difficulties = Object.keys(difficultyLabels) as InterviewDifficulty[];

  return <main className="mx-auto max-w-6xl px-4 py-7 sm:px-6 lg:px-8">
    <div className="grid gap-8 lg:grid-cols-[1.03fr_0.97fr] lg:items-start">
      <section className="rounded-[28px] bg-[#0A0A0F] p-6 text-white shadow-2xl shadow-indigo-950/20 sm:p-9">
        <SignalLabel status="live">Interview studio · audio first</SignalLabel>
        <h1 className="mt-6 max-w-xl text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">Practice the answer, not the performance.</h1>
        <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">PrepAI responds like an interviewer: it listens for structure, asks the useful follow-up, then turns your session into a precise next step.</p>
        <div className="mt-9 rounded-2xl border border-white/10 bg-white/[0.045] p-5">
          <div className="flex items-center justify-between"><div><p className="font-semibold">Live signal preview</p><p className="mt-1 text-sm text-slate-400">No camera. No visual distraction.</p></div><Headphones className="text-violet-300" /></div>
          <Waveform compact />
          <div className="grid gap-2 border-t border-white/10 pt-4 text-sm sm:grid-cols-2"><span className="flex items-center gap-2 text-slate-300"><ShieldCheck size={16} className="text-emerald-400" /> Private practice room</span><span className="flex items-center gap-2 text-slate-300"><Sparkles size={16} className="text-violet-300" /> Feedback in minutes</span></div>
        </div>
        <p className="mt-7 text-sm leading-6 text-slate-400">Want a practice trail first? <Link className="font-semibold text-indigo-300 hover:text-white" to="/skill-gap">Start with your skill gap</Link>.</p>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_60px_-32px_rgba(30,41,59,.35)] sm:p-7">
        <div className="flex items-start gap-4 border-b border-slate-100 pb-5"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600"><Mic size={21} /></span><div><h2 className="text-xl font-semibold tracking-tight text-slate-950">Set your practice brief</h2><p className="mt-1 text-sm text-slate-500">This takes about a minute. Your settings shape the questions.</p></div></div>
        <div className="mt-6 space-y-6">
          <fieldset><legend className="text-sm font-semibold text-slate-800">Interview focus</legend><div className="mt-3 grid grid-cols-2 gap-2">
            {kinds.map((kind) => <button key={kind} type="button" onClick={() => update('kind', kind)} aria-pressed={configuration.kind === kind} className={`min-h-14 rounded-xl border px-3 text-left text-sm font-semibold transition ${configuration.kind === kind ? 'border-indigo-600 bg-indigo-50 text-indigo-800 shadow-sm' : 'border-slate-200 text-slate-600 hover:border-indigo-200 hover:bg-slate-50'}`}>{interviewKindLabels[kind]}</button>)}
          </div></fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-slate-800">Target role<select value={configuration.targetRole} onChange={(event) => update('targetRole', event.target.value)} className="min-h-12 rounded-xl border border-slate-200 bg-white px-3 font-normal text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100">{setupQuery.data.roles.map((role) => <option key={role}>{role}</option>)}</select></label>
            <label className="grid gap-2 text-sm font-semibold text-slate-800">Company lens<select value={configuration.company} onChange={(event) => update('company', event.target.value)} className="min-h-12 rounded-xl border border-slate-200 bg-white px-3 font-normal text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100">{setupQuery.data.companies.map((company) => <option key={company}>{company}</option>)}</select></label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-slate-800">Difficulty<select value={configuration.difficulty} onChange={(event) => update('difficulty', event.target.value as InterviewDifficulty)} className="min-h-12 rounded-xl border border-slate-200 bg-white px-3 font-normal text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100">{difficulties.map((difficulty) => <option key={difficulty} value={difficulty}>{difficultyLabels[difficulty]}</option>)}</select></label>
            <label className="grid gap-2 text-sm font-semibold text-slate-800">Length<select value={configuration.durationMinutes} onChange={(event) => update('durationMinutes', Number(event.target.value) as 20 | 30 | 45)} className="min-h-12 rounded-xl border border-slate-200 bg-white px-3 font-normal text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"><option value={20}>20 minutes</option><option value={30}>30 minutes</option><option value={45}>45 minutes</option></select></label>
          </div>
          {setupQuery.data.resumes.length > 0 && <label className="grid gap-2 text-sm font-semibold text-slate-800">Resume context<select value={configuration.resumeId ?? ''} onChange={(event) => update('resumeId', event.target.value || undefined)} className="min-h-12 rounded-xl border border-slate-200 bg-white px-3 font-normal text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"><option value="">No resume context</option>{setupQuery.data.resumes.map((resume) => <option key={resume.id} value={resume.id}>{resume.name}</option>)}</select><span className="flex items-center gap-1.5 text-xs font-normal text-slate-500"><FileText size={13} /> We’ll use it only for question context.</span></label>}
          <DeviceCheck state={deviceState} />
          <div className="grid gap-3 sm:grid-cols-[auto_1fr]"><button type="button" onClick={checkMicrophone} disabled={deviceState === 'checking'} className="min-h-12 rounded-xl border border-indigo-200 px-4 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-60">{deviceState === 'checking' ? 'Checking…' : 'Check microphone'}</button><button type="button" disabled={createInterview.isPending} onClick={() => createInterview.mutate(configuration, { onSuccess: (session) => navigate(`/interviews/${session.id}/live`) })} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">{createInterview.isPending ? 'Creating your room…' : 'Enter interview room'} <ArrowRight size={17} /></button></div>
          {createInterview.isError && <p role="alert" className="text-sm text-rose-600">We couldn’t create the room. Please try once more.</p>}
          <p className="flex items-center gap-2 text-xs leading-5 text-slate-500"><CheckCircle2 size={14} className="shrink-0 text-emerald-600" /> You can continue even if your browser blocks a microphone; demo audio remains available.</p>
        </div>
      </section>
    </div>
  </main>;
}
