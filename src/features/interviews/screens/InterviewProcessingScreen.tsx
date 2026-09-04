import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, Clock3, Sparkles } from 'lucide-react';
import { Waveform } from '../components/InterviewPrimitives';
import { useReportStatus } from '@/features/reports/queries';

export default function InterviewProcessingScreen() {
  const { sessionId = 'demo-live' } = useParams();
  const navigate = useNavigate();
  const statusQuery = useReportStatus(sessionId);
  const status = statusQuery.data;
  useEffect(() => { if (status?.state === 'ready') navigate(`/interviews/${sessionId}/report`, { replace: true }); }, [navigate, sessionId, status?.state]);
  const progress = status?.progress ?? 28;
  return <main className="grid min-h-[72vh] place-items-center bg-[#0A0A0F] px-4 py-12 text-center text-white"><section className="w-full max-w-xl border border-white/10 bg-[#111118] p-7 shadow-2xl sm:p-10"><div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-indigo-500/15 text-indigo-300"><Sparkles size={25} /></div><p className="mt-6 font-mono text-[11px] uppercase tracking-[0.16em] text-indigo-200">Interview complete</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">Turning your practice into a plan.</h1><p className="mx-auto mt-4 max-w-md text-sm leading-6 text-slate-400">We’re grounding feedback in your transcript, pacing, and the role’s interview signals.</p><Waveform active compact /><div className="mt-4 h-1.5 overflow-hidden bg-white/10"><div className="h-full bg-indigo-400 transition-all duration-700" style={{ width: `${progress}%` }} /></div><div className="mt-3 flex items-center justify-between text-xs text-slate-400"><span className="flex items-center gap-1.5"><Clock3 size={14} /> {status?.message ?? 'Preparing your signal map'}</span><span>{progress}%</span></div>{statusQuery.isError && <button onClick={() => statusQuery.refetch()} className="mt-6 min-h-11 border border-indigo-300/50 px-4 text-sm font-semibold text-indigo-100">Check report status</button>} {status?.state === 'ready' && <p className="mt-6 inline-flex items-center gap-2 text-sm text-emerald-300"><CheckCircle2 size={16} /> Opening your report…</p>}</section></main>;
}
