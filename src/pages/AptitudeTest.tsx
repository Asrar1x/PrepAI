import { AptitudeTestRunner } from '@/features/aptitude/AptitudeTestRunner';
import { AlertCircle } from 'lucide-react';

export default function AptitudeTest() {
  // Sensible default target.  In a fuller build this would come from the
  // student's chosen role/company (e.g. /dashboard) — we keep it as a query
  // parameter on the route for now.
  const params = new URLSearchParams(window.location.search);
  const roleSlug = params.get('role') ?? 'software-developer-sde';
  const companySlug = params.get('company') ?? undefined;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Aptitude Test</h1>
        <p className="text-sm text-slate-500">
          Role: <code className="bg-slate-100 px-1 rounded">{roleSlug}</code>
          {companySlug && (
            <>
              {' '}
              · Company: <code className="bg-slate-100 px-1 rounded">{companySlug}</code>
            </>
          )}
        </p>
      </div>
      <div className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 mt-0.5" />
        Difficulty adapts to your answers per category. 3 correct in a row moves you up;
        2 wrong in a row moves you down.
      </div>
      <AptitudeTestRunner roleSlug={roleSlug} companySlug={companySlug} />
    </div>
  );
}
