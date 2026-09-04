// Intelligence Hub — pick a company → see its 2026 pattern + get a study plan.
import { useState } from 'react';
import { useIntelligenceCompanies, useIntelligenceRoles, useGenerateStudyPlan } from './queries';
import { PatternExplainer } from './PatternExplainer';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui';
import { Skeleton } from '@/shared/components/Skeleton';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import { Briefcase, Building2, Sparkles } from 'lucide-react';

export function IntelligenceHub() {
  const rolesQ = useIntelligenceRoles();
  const companiesQ = useIntelligenceCompanies();
  const [selected, setSelected] = useState<string | null>(null);
  const generate = useGenerateStudyPlan();
  const [planFor, setPlanFor] = useState<{ role: string; company: string | null } | null>(null);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-indigo-500" /> Intelligence Hub
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Pick a target company to see its 2026 assessment pattern; pair it with a role to get a personalized 30-day study plan.
        </p>
      </header>

      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <Briefcase className="w-4 h-4" /> Roles ({rolesQ.data?.length ?? '…'})
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {rolesQ.isLoading
            ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-16" />)
            : (rolesQ.data ?? []).map((r) => (
                <button
                  key={r.slug}
                  onClick={() => setPlanFor({ role: r.slug, company: selected })}
                  className="text-left rounded-md border border-slate-200 bg-white p-2 hover:border-indigo-400 hover:shadow-sm transition"
                >
                  <div className="text-sm font-medium text-slate-800">{r.title}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{r.category} · {r.salary_range}</div>
                </button>
              ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <Building2 className="w-4 h-4" /> Companies ({companiesQ.data?.length ?? '…'})
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {companiesQ.isLoading
            ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24" />)
            : (companiesQ.data ?? []).map((c) => (
                <button
                  key={c.slug}
                  onClick={() => setSelected(c.slug)}
                  className={`text-left rounded-md border p-3 transition ${
                    selected === c.slug
                      ? 'border-indigo-500 ring-2 ring-indigo-200 bg-indigo-50/30'
                      : 'border-slate-200 bg-white hover:border-indigo-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-slate-800">{c.name}</div>
                    <Badge>{c.hiring_signal}</Badge>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">{c.industry}</div>
                  <div className="text-[11px] text-slate-500">{c.salary_range}</div>
                </button>
              ))}
        </div>
      </section>

      {selected && (
        <section>
          <ErrorBoundary>
            <PatternExplainer slug={selected} />
          </ErrorBoundary>
        </section>
      )}

      {planFor && (
        <section>
          <Card>
            <CardHeader>
              <CardTitle>30-day study plan</CardTitle>
            </CardHeader>
            <CardContent>
              <button
                disabled={generate.isPending}
                onClick={() =>
                  generate.mutate(
                    {
                      role_slug: planFor.role,
                      company_slug: planFor.company,
                      ratings: {},
                    },
                    {
                      onSuccess: () => {
                        // success surfaced inline
                      },
                    },
                  )
                }
                className="px-3 py-1.5 rounded-md bg-indigo-600 text-white text-sm hover:bg-indigo-700 disabled:opacity-50"
              >
                {generate.isPending ? 'Generating…' : 'Generate plan'}
              </button>
              {generate.data && (
                <div className="mt-4 space-y-2 text-sm text-slate-700">
                  <div>
                    <strong>Tips:</strong> {generate.data.plan.role_specific_tips}
                  </div>
                  <div>
                    <strong>Weekly milestones:</strong>
                    <ul className="list-disc list-inside">
                      {generate.data.plan.weekly_milestones.map((m, i) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <strong>Estimated readiness:</strong> {generate.data.plan.estimated_readiness_pct}%
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {generate.data.plan.days.length} day plan · Plan id {generate.data.id}
                  </div>
                </div>
              )}
              {generate.isError && (
                <div className="mt-3 text-sm text-rose-700">
                  {(generate.error as Error).message}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
