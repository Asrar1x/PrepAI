// Pattern Explainer view — renders the 2026 company pattern returned by
// /intelligence/companies/{slug}/pattern. Used from RoleExplorer / companies page.
import { useCompanyPattern } from './queries';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui';
import { Skeleton } from '@/shared/components/Skeleton';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import { BarChart3, Clock, FileText, Layers, ShieldAlert, Target } from 'lucide-react';

interface PatternExplainerProps {
  slug: string;
}

export function PatternExplainer({ slug }: PatternExplainerProps) {
  const { data, isLoading, isError, error } = useCompanyPattern(slug);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
        <Skeleton className="h-64 md:col-span-2" />
      </div>
    );
  }
  if (isError) {
    return (
      <Card className="border-red-200 bg-red-50/40">
        <CardContent className="py-6 text-sm text-red-700">
          Could not load pattern for <code>{slug}</code>: {(error as Error)?.message ?? 'unknown error'}
        </CardContent>
      </Card>
    );
  }
  if (!data) return null;

  const distribution = data.distribution ?? {};
  const neg = data.negative_marking ?? {};
  const totalQs = data.sections?.reduce((a, s) => a + s.questions, 0) ?? 0;
  const totalMins = data.sections?.reduce((a, s) => a + s.duration_minutes, 0) ?? 0;

  return (
    <ErrorBoundary>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-indigo-500" />
                  {data.name}
                </CardTitle>
                <p className="text-sm text-slate-500 mt-1">{data.industry} · {data.salary_range}</p>
              </div>
              <Badge variant="outline">{data.hiring_signal}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-700">{data.assessment_summary}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
              <span className="px-2 py-1 rounded bg-slate-100">{totalQs} questions</span>
              <span className="px-2 py-1 rounded bg-slate-100">{totalMins} min</span>
              <span className="px-2 py-1 rounded bg-slate-100">{data.sections?.length ?? 0} sections</span>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-500" /> Sections
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.sections?.map((s) => (
                <div key={s.name} className="rounded border border-slate-200 p-3">
                  <div className="flex justify-between items-baseline">
                    <h4 className="font-medium text-slate-800">{s.name}</h4>
                    <span className="text-xs text-slate-500">{s.questions} Qs · {s.duration_minutes} min</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {s.topics?.map((t) => (
                      <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-amber-500" /> Difficulty distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(distribution).map(([k, v]) => {
                const pct = Math.round((v as number) * 100);
                return (
                  <div key={k}>
                    <div className="flex justify-between text-sm">
                      <span className="capitalize text-slate-700">{k}</span>
                      <span className="text-slate-500">{pct}%</span>
                    </div>
                    <div className="h-2 mt-1 bg-slate-100 rounded">
                      <div
                        className={`h-2 rounded ${k === 'easy' ? 'bg-emerald-400' : k === 'medium' ? 'bg-amber-400' : 'bg-rose-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {neg && Object.keys(neg).length > 0 && (
                <div className="mt-4 rounded border border-rose-200 bg-rose-50 p-3">
                  <div className="flex items-center gap-2 text-rose-700 text-sm font-medium">
                    <ShieldAlert className="w-4 h-4" /> Negative marking
                  </div>
                  <div className="text-xs text-rose-700 mt-1 space-y-0.5">
                    {Object.entries(neg).map(([k, v]) => (
                      <div key={k}>{k}: {String(v)}</div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-500" /> Timings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs text-slate-600 bg-slate-50 rounded p-3 overflow-x-auto">
{JSON.stringify(data.timings ?? {}, null, 2)}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-violet-500" /> Study plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <a
              href={`/study-plan?role=${encodeURIComponent(slug)}&company=${encodeURIComponent(slug)}`}
              className="text-sm text-indigo-600 hover:underline"
            >
              Generate a personalized 30-day study plan for {data.name} →
            </a>
          </CardContent>
        </Card>
      </div>
    </ErrorBoundary>
  );
}
