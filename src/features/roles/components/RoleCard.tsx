import { ArrowUpRight, Code2, Layers3, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Role } from '../types';

const difficultyClasses: Record<Role['difficulty'], string> = {
  Foundation: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  Growing: 'bg-amber-50 text-amber-800 ring-amber-200',
  Advanced: 'bg-violet-50 text-violet-800 ring-violet-200',
};

export function RoleCard({ role }: { role: Role }) {
  return (
    <article className="group relative flex min-h-72 flex-col border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-1 hover:border-indigo-300 hover:shadow-[0_18px_40px_rgba(49,46,129,0.12)]">
      <div className="mb-5 flex items-start justify-between gap-3">
        <span className="grid size-11 place-items-center border border-indigo-200 bg-indigo-50 text-indigo-700" aria-hidden="true">
          {role.category === 'Data & AI' ? <Layers3 size={21} /> : role.category === 'Product & Business' ? <Sparkles size={21} /> : <Code2 size={21} />}
        </span>
        <span className={`border px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.14em] ${difficultyClasses[role.difficulty]}`}>
          {role.difficulty}
        </span>
      </div>
      <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">{role.category}</p>
      <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950">{role.title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{role.description}</p>
      <div className="mt-5 flex flex-wrap gap-1.5">
        {role.skills.slice(0, 3).map((skill) => <span key={skill} className="border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700">{skill}</span>)}
      </div>
      <div className="mt-auto flex items-end justify-between border-t border-slate-100 pt-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">Fresher range</p>
          <p className="mt-1 text-sm font-bold text-emerald-700">{role.salaryRange}</p>
        </div>
        <Link to={`/roles/${role.slug}`} className="inline-flex min-h-11 items-center gap-1 text-sm font-bold text-indigo-700 outline-none transition hover:text-indigo-950 focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2">
          Open role <ArrowUpRight size={17} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
