import { Search, SlidersHorizontal } from 'lucide-react';
import { useDeferredValue, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { roleCategories } from '../data';
import { RoleCard } from '../components/RoleCard';
import { useRoles } from '../queries';
import type { RoleCategory } from '../types';

export default function RolesScreen() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<RoleCategory | 'All'>('All');
  const deferredQuery = useDeferredValue(query);
  const filters = useMemo(() => ({ query: deferredQuery, category }), [deferredQuery, category]);
  const { data: roles, isLoading, isError, refetch } = useRoles(filters);

  return (
    <main className="min-h-full bg-[#f8f8fb] px-4 py-8 text-slate-950 sm:px-6 lg:px-10">
      <section className="mx-auto max-w-7xl">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-indigo-700">Role intelligence / 2026</p>
        <div className="mt-3 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-black tracking-[-0.04em] text-[#0A0A0F] sm:text-5xl">Know what the role asks of you.</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">Compare fresher roles, see the skills hiring teams actually test, then convert the gap into a focused plan.</p>
          </div>
          <Link to="/skill-gap" className="inline-flex min-h-12 items-center justify-center border border-indigo-700 bg-indigo-700 px-5 text-sm font-bold text-white shadow-[4px_4px_0_#312E81] outline-none transition hover:-translate-y-0.5 hover:bg-[#312E81] focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2">Analyse my gaps</Link>
        </div>

        <div className="mt-9 border-y border-indigo-100 bg-white py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <label className="relative block min-w-0 flex-1 lg:max-w-xl">
              <span className="sr-only">Search roles or skills</span>
              <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={19} aria-hidden="true" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search roles or skills" className="min-h-12 w-full border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100" />
            </label>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:justify-end" aria-label="Role categories">
              <SlidersHorizontal className="shrink-0 text-slate-400" size={18} aria-hidden="true" />
              {(['All', ...roleCategories] as const).map((item) => (
                <button key={item} type="button" onClick={() => setCategory(item)} aria-pressed={category === item} className={`min-h-10 shrink-0 border px-3 text-xs font-bold transition outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${category === item ? 'border-[#312E81] bg-[#312E81] text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300'}`}>
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between text-sm text-slate-500" aria-live="polite">
          <span>{isLoading ? 'Scanning role signals…' : `${roles?.length ?? 0} roles matched`}</span>
          <span className="font-mono text-xs">Updated this month</span>
        </div>

        {isError ? <div className="mt-6 border border-red-200 bg-red-50 p-6" role="alert"><p className="font-bold text-red-900">Role data is unavailable.</p><button type="button" onClick={() => void refetch()} className="mt-3 min-h-10 border border-red-300 px-3 text-sm font-semibold text-red-800 outline-none focus-visible:ring-2 focus-visible:ring-red-600">Try again</button></div> : null}
        {isLoading ? <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Loading roles">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-72 animate-pulse border border-slate-200 bg-white" />)}</div> : null}
        {!isLoading && !isError && roles?.length === 0 ? <div className="mt-8 border border-dashed border-slate-300 bg-white p-10 text-center"><p className="font-bold text-slate-900">No roles match that signal.</p><button type="button" onClick={() => { setQuery(''); setCategory('All'); }} className="mt-3 min-h-10 text-sm font-bold text-indigo-700 outline-none focus-visible:ring-2 focus-visible:ring-indigo-600">Clear filters</button></div> : null}
        {!isLoading && !isError && roles?.length ? <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{roles.map((role) => <RoleCard key={role.id} role={role} />)}</div> : null}
      </section>
    </main>
  );
}
