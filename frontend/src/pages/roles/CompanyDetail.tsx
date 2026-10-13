import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { companiesApi } from '../../api/roles';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import {
  Building2,
  BookOpen,
  Mic,
  CheckCircle2,
  ListOrdered
} from '../../components/icons';

export const CompanyDetail: React.FC = () => {
  const { companySlug = 'tcs' } = useParams<{ companySlug: string }>();

  const { data: company, isLoading } = useQuery({
    queryKey: ['company', companySlug],
    queryFn: () => companiesApi.getCompanyBySlug(companySlug),
  });

  if (!isLoading && !company) {
    return (
      <div className="py-20 text-center space-y-3">
        <h1 className="text-xl font-bold text-white">Company not found</h1>
        <p className="text-xs text-gray-400">The company you are looking for does not exist.</p>
        <Link to="/roles" className="text-xs text-brand-400 hover:underline">Browse all roles</Link>
      </div>
    );
  }

  if (isLoading || !company) {
    return (
      <div className="space-y-6">
        <Skeleton className="w-full h-44 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="p-8 rounded-xl bg-[#1F1F1E] border border-gray-800 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="flex items-center text-brand-400">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-semibold text-white">{company.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="accent">{company.tier}</Badge>
                  <span className="text-xs font-mono text-emerald-400 font-semibold">{company.averagePackage}</span>
                </div>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-gray-300 max-w-2xl leading-relaxed">
              {company.hiringOverview}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 shrink-0">
            <Link to={`/aptitude?company=${company.slug}`}>
              <Button variant="primary" size="md" leftIcon={<BookOpen className="w-4 h-4" />}>
                Practice Aptitude Test
              </Button>
            </Link>
            <Link to={`/interview?company=${company.slug}`}>
              <Button variant="secondary" size="md" leftIcon={<Mic className="w-4 h-4" />}>
                Mock Interview
              </Button>
            </Link>
          </div>
        </div>

        {/* Roles Hired */}
        <div className="mt-6 pt-6 border-t border-gray-800/80 flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-400 font-semibold mr-2">
            Target Job Profiles:
          </span>
          {(company.rolesHired || ['Software Engineer', 'Graduate Trainee']).map((role) => (
            <span
              key={role}
              className="text-xs px-3 py-1 rounded-lg bg-[#171716] text-gray-300 border border-gray-700/60 font-medium"
            >
              {role}
            </span>
          ))}
        </div>
      </div>

      {/* Online Test Pattern & Section Breakdown */}
      <Card className="p-6 bg-[#171716] border-gray-800 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-white">Online Test Structure</h3>
            <p className="text-xs text-gray-400 mt-0.5">{company.testFormat}</p>
          </div>
          <div className="flex items-center space-x-3 text-xs font-mono">
            <span className="text-brand-400 font-bold">{company.totalQuestions || 60} Questions</span>
            <span className="text-gray-500">•</span>
            <span className="text-gray-300">{company.totalDurationMinutes || 90} Minutes Total</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {(company.sections || []).map((sec, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-[#1F1F1E] border border-gray-700/60 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-gray-200">{sec.name}</span>
                <span className="font-mono text-brand-400">{sec.timeLimitMinutes}m</span>
              </div>
              <div className="text-xs font-mono text-gray-400">{sec.questionCount} Questions</div>
              <div className="pt-2 border-t border-gray-800 flex flex-wrap gap-1">
                {(sec.topics || []).map((t, tIdx) => (
                  <span key={tIdx} className="text-[11px] bg-[#171716] text-gray-300 px-1.5 py-0.5 rounded">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Interview Process & Preparation Tips */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="p-6 bg-[#171716] border-gray-800 space-y-4">
          <div className="flex items-center space-x-2 border-b border-gray-800 pb-3">
            <ListOrdered className="w-5 h-5 text-brand-400" />
            <h3 className="text-base font-bold text-white">Placement Selection Pipeline</h3>
          </div>
          <div className="space-y-3">
            {(company.interviewProcess || []).map((step, idx) => (
              <div key={idx} className="flex items-center space-x-3 p-3 rounded-xl bg-[#1F1F1E]/60 border border-gray-800">
                <span className="w-6 h-6 rounded-full bg-brand-600/20 text-brand-400 border border-brand-500/30 flex items-center justify-center text-xs font-bold font-mono">
                  {idx + 1}
                </span>
                <span className="text-xs font-medium text-gray-200">{step}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 bg-[#171716] border-gray-800 space-y-4">
          <div className="flex items-center space-x-2 border-b border-gray-800 pb-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">Key Placement Tips</h3>
          </div>
          <div className="space-y-3">
            {(company.keyPreparationTips || []).map((tip, idx) => (
              <div key={idx} className="flex items-start space-x-3 p-3 rounded-xl bg-[#1F1F1E]/60 border border-gray-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-xs text-gray-300 leading-relaxed">{tip}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
