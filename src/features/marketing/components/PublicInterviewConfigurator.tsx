import { ArrowRight, Mic2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { companies } from '@/features/companies/data';
import { roles } from '@/features/roles/data';
import { useAuthStore } from '@/shared/stores/authStore';
import { type InterviewDraft, type InterviewType, saveInterviewDraft } from '../interviewDraft';

const interviewTypes: InterviewType[] = ['Technical', 'HR', 'Behavioural', 'Company simulation'];

export function PublicInterviewConfigurator({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate();
  const accessToken = useAuthStore((state) => state.accessToken);
  const setPendingPath = useAuthStore((state) => state.setPendingPath);
  const [draft, setDraft] = useState<InterviewDraft>({ roleSlug: 'software-development-engineer', companySlug: 'tcs', interviewType: 'Technical' });
  const [notice, setNotice] = useState('');

  function update<K extends keyof InterviewDraft>(key: K, value: InterviewDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function continueToSetup() {
    saveInterviewDraft(draft);
    if (accessToken) {
      navigate('/interviews/setup');
      return;
    }
    setPendingPath('/interviews/setup');
    setNotice('Your interview configuration is saved. Create an account to start the live session.');
    navigate('/auth/register?next=%2Finterviews%2Fsetup');
  }

  return (
    <form onSubmit={(event) => { event.preventDefault(); continueToSetup(); }} className={`border border-indigo-400/40 bg-[#111118] text-white shadow-[8px_8px_0_rgba(99,102,241,0.35)] ${compact ? 'p-4' : 'p-5 sm:p-6'}`}>
      <div className="flex items-start justify-between gap-4"><div><p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-300">Audio-first practice</p><h2 className="mt-1 text-xl font-black tracking-[-0.03em]">Set your interview signal</h2></div><span className="flex size-10 shrink-0 items-center justify-center border border-indigo-400/60 bg-indigo-500/20 text-indigo-200"><Mic2 size={18} aria-hidden="true" /></span></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-300">Target role</span><select value={draft.roleSlug} onChange={(event) => update('roleSlug', event.target.value)} className="min-h-12 w-full border border-slate-700 bg-[#1A1A26] px-3 text-sm text-white outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-400/30">{roles.map((role) => <option key={role.slug} value={role.slug}>{role.title}</option>)}</select></label>
        <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-300">Company pattern</span><select value={draft.companySlug} onChange={(event) => update('companySlug', event.target.value)} className="min-h-12 w-full border border-slate-700 bg-[#1A1A26] px-3 text-sm text-white outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-400/30">{companies.map((company) => <option key={company.slug} value={company.slug}>{company.name}</option>)}</select></label>
      </div>
      <fieldset className="mt-4"><legend className="text-xs font-bold text-slate-300">Interview mode</legend><div className="mt-2 grid grid-cols-2 gap-2">{interviewTypes.map((type) => <label key={type} className={`flex min-h-11 cursor-pointer items-center justify-center border px-2 text-center text-xs font-bold transition ${draft.interviewType === type ? 'border-indigo-300 bg-indigo-500/25 text-white' : 'border-slate-700 text-slate-300 hover:border-slate-500'}`}><input className="sr-only" type="radio" name="interviewType" checked={draft.interviewType === type} onChange={() => update('interviewType', type)} />{type}</label>)}</div></fieldset>
      <button type="submit" className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 bg-[#6366F1] px-4 text-sm font-bold text-white outline-none transition hover:bg-[#8B5CF6] focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#111118]">Continue to interview setup <ArrowRight size={17} aria-hidden="true" /></button>
      <p className="mt-3 text-xs leading-5 text-slate-400">No camera required. You’ll check microphone permissions before joining.</p>
      {notice ? <p aria-live="polite" className="sr-only">{notice}</p> : null}
    </form>
  );
}
