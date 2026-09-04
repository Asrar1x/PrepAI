import { ArrowLeft, CheckCircle2, Headphones, Mic2, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PublicInterviewConfigurator } from '../components/PublicInterviewConfigurator';
import { SignalMark } from '../components/SignalMark';

export default function StartScreen() {
  return (
    <main className="min-h-full bg-[#0A0A0F] px-4 py-5 text-white sm:px-6 lg:px-10">
      <header className="mx-auto flex max-w-6xl items-center justify-between"><Link to="/" className="text-lg outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"><SignalMark /></Link><Link to="/roles" className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-slate-300 hover:text-white"><ArrowLeft size={16} /> Explore roles</Link></header>
      <section className="mx-auto grid max-w-6xl gap-10 py-12 lg:grid-cols-[.85fr_1.15fr] lg:items-center"><div><p className="font-mono text-xs font-bold uppercase tracking-[.18em] text-indigo-300">New practice session</p><h1 className="mt-3 text-4xl font-black tracking-[-.05em] sm:text-5xl">Configure the room before you enter it.</h1><p className="mt-5 max-w-md leading-7 text-slate-300">Choose the role and pattern you want to rehearse. We’ll preserve this setup through sign-in, then run a microphone check before the session starts.</p><ul className="mt-8 space-y-4">{[[Mic2, 'Audio only', 'No camera control, no visual distraction.'], [Headphones, 'Focused live room', 'Phase cues, waveform, and transcript in one view.'], [ShieldCheck, 'Your preparation path', 'Setup links back to your plan and reports.']].map(([Icon, title, text]) => { const IconComponent = Icon as typeof Mic2; return <li key={title as string} className="flex gap-3"><span className="grid size-9 shrink-0 place-items-center border border-indigo-400/40 text-indigo-300"><IconComponent size={17} /></span><span><b className="block text-sm">{title as string}</b><span className="mt-1 block text-sm text-slate-400">{text as string}</span></span></li>; })}</ul></div><div><PublicInterviewConfigurator /><p className="mt-4 flex items-center gap-2 text-xs text-slate-400"><CheckCircle2 size={15} className="text-emerald-400" /> Configuration stays with this browser until your session is created.</p></div></section>
    </main>
  );
}
