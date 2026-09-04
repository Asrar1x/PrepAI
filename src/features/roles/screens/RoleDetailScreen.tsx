import { ArrowLeft, ArrowRight, CheckCircle2, CircleDot, Clock3, Factory, ShieldCheck } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useRole } from '../queries';

const priorityText = { essential: 'Core signal', important: 'High value', useful: 'Useful edge' } as const;

export default function RoleDetailScreen() {
  const { roleSlug = '' } = useParams();
  const { data: role, isLoading, isError, refetch } = useRole(roleSlug);

  if (isLoading) return <main className="min-h-full bg-[#f8f8fb] px-4 py-10 sm:px-6"><div className="mx-auto h-96 max-w-6xl animate-pulse bg-white" aria-label="Loading role detail" /></main>;
  if (isError) return <main className="grid min-h-full place-items-center bg-[#f8f8fb] p-6"><div role="alert" className="max-w-md border border-red-200 bg-red-50 p-6"><p className="font-bold text-red-900">We could not load this role.</p><button type="button" onClick={() => void refetch()} className="mt-4 min-h-11 border border-red-300 px-4 font-semibold text-red-800">Try again</button></div></main>;
  if (!role) return <main className="grid min-h-full place-items-center bg-[#f8f8fb] p-6"><div className="max-w-md border border-slate-200 bg-white p-7 text-center"><p className="font-mono text-xs uppercase tracking-[0.16em] text-slate-500">Signal not found</p><h1 className="mt-2 text-2xl font-black">This role is not in the current map.</h1><Link to="/roles" className="mt-5 inline-flex min-h-11 items-center gap-2 bg-indigo-700 px-4 text-sm font-bold text-white"><ArrowLeft size={16} /> All roles</Link></div></main>;

  return (
    <main className="min-h-full bg-[#f8f8fb] px-4 py-8 text-slate-950 sm:px-6 lg:px-10">
      <section className="mx-auto max-w-6xl">
        <Link to="/roles" className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-slate-600 outline-none hover:text-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-600"><ArrowLeft size={16} /> Role explorer</Link>
        <header className="mt-5 border-l-4 border-indigo-600 bg-white px-6 py-7 shadow-[0_12px_35px_rgba(15,23,42,0.05)] sm:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl"><p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-indigo-700">{role.category}</p><h1 className="mt-2 text-4xl font-black tracking-[-0.04em] sm:text-5xl">{role.title}</h1><p className="mt-4 text-base leading-7 text-slate-600">{role.description}</p></div>
            <div className="border border-emerald-200 bg-emerald-50 px-4 py-3 text-right"><p className="text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-700">Fresher range</p><p className="mt-1 text-xl font-black text-emerald-950">{role.salaryRange}</p></div>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">{role.skills.map((skill) => <span key={skill} className="border border-indigo-100 bg-indigo-50 px-2.5 py-1.5 text-xs font-bold text-indigo-900">{skill}</span>)}</div>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_.65fr]">
          <section className="border border-slate-200 bg-white p-5 sm:p-7"><div className="flex items-center gap-2"><ShieldCheck className="text-indigo-700" size={20} /><h2 className="text-xl font-black">Skill signals to build</h2></div><p className="mt-2 text-sm text-slate-600">Rate these honestly in the gap analyser to receive a useful plan.</p><ol className="mt-6 space-y-0 border-t border-slate-100">{role.requiredSkills.map((skill, index) => <li key={skill.name} className="flex gap-4 border-b border-slate-100 py-4"><span className="grid size-7 shrink-0 place-items-center bg-slate-100 font-mono text-xs font-bold text-slate-600">{String(index + 1).padStart(2, '0')}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold text-slate-900">{skill.name}</h3><span className="text-[11px] font-bold uppercase tracking-[0.12em] text-indigo-700">{priorityText[skill.priority]}</span></div><p className="mt-1 text-sm leading-6 text-slate-600">{skill.description}</p></div></li>)}</ol></section>
          <aside className="space-y-5"><section className="border border-slate-200 bg-[#111118] p-5 text-white"><p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-300">Hiring signal</p><p className="mt-3 text-lg font-bold leading-7">{role.hiringSignal}</p><Link to={`/skill-gap?role=${role.slug}`} className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 bg-[#6366F1] px-4 text-sm font-bold text-white outline-none hover:bg-[#8B5CF6] focus-visible:ring-2 focus-visible:ring-white">Analyse my fit <ArrowRight size={16} /></Link></section><section className="border border-slate-200 bg-white p-5"><div className="flex items-center gap-2"><Factory size={18} className="text-slate-500" /><h2 className="font-bold">Company presence</h2></div><p className="mt-2 text-sm leading-6 text-slate-600">Relevant hiring patterns currently mapped to this role.</p><div className="mt-4 flex flex-wrap gap-2">{role.companySlugs.map((company) => <Link key={company} to={`/companies/${company}`} className="border border-slate-200 px-2.5 py-1.5 text-xs font-bold capitalize text-slate-700 outline-none hover:border-indigo-300 hover:text-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-600">{company.replace('-', ' ')}</Link>)}</div></section></aside>
        </div>

        <section className="mt-6 border border-slate-200 bg-white p-5 sm:p-7"><div className="flex items-center gap-2"><Clock3 className="text-indigo-700" size={20} /><h2 className="text-xl font-black">Typical interview path</h2></div><div className="mt-6 grid gap-4 md:grid-cols-3">{role.interviewRounds.map((round, index) => <article key={round.name} className="relative border border-slate-200 p-4"><span className="font-mono text-xs font-bold text-indigo-700">0{index + 1}</span><h3 className="mt-4 font-bold">{round.name}</h3><p className="mt-1 text-sm font-semibold text-slate-500">{round.duration}</p><p className="mt-3 text-sm leading-6 text-slate-600">{round.focus}</p><CircleDot className="absolute right-4 top-4 text-indigo-200" size={18} aria-hidden="true" /></article>)}</div><p className="mt-5 flex items-center gap-2 text-xs text-slate-500"><CheckCircle2 size={15} className="text-emerald-600" /> Pattern guidance is refreshed from the 2026 preparation map.</p></section>
      </section>
    </main>
  );
}
