import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../api/admin';
import { getFriendlyErrorMessage } from '../../api/client';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { ArrowLeft } from '../../components/icons';
import { Link } from 'react-router-dom';

export const BatchAnalytics: React.FC = () => {
  const { data: analytics, isLoading, isError, error } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: () => adminApi.getBatchAnalytics(),
  });

  if (isError) {
    return <div className="py-20 text-center text-sm text-rose-300">{getFriendlyErrorMessage(error)}</div>;
  }

  if (isLoading || !analytics) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { weakTopics, companyReadiness } = analytics;

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="p-8 rounded-xl bg-[#1F1F1E] border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-white">Batch weak topics</h1>
          <p className="text-xs text-gray-400">
            The topics each batch scores lowest on, and how many students meet each company's cutoff.
          </p>
        </div>

        <Link to="/admin">
          <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}>
            Back to Overview
          </Button>
        </Link>
      </div>

      {/* Weak Topics Heatmap Matrix */}
      <Card className="p-6 bg-[#171716] border-gray-800 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-white">Weak topics by batch</h3>
            <p className="text-xs text-gray-400 mt-0.5">Prioritize remedial bootcamps based on fail rates</p>
          </div>
          <Badge variant="danger">Intervention Needed</Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-800 bg-[#1F1F1E]/50 text-gray-400 font-semibold">
                <th className="py-3.5 px-4">Topic Name</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Batch Average</th>
                <th className="py-3.5 px-4">Students Struggling</th>
                <th className="py-3.5 px-4">Severity Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {weakTopics.map((t, idx) => (
                <tr key={idx} className="hover:bg-[#1F1F1E]/40 transition-colors">
                  <td className="py-4 px-4 font-bold text-gray-200">{t.topic}</td>
                  <td className="py-4 px-4 text-gray-400">{t.category}</td>
                  <td className="py-4 px-4 font-mono font-bold text-brand-400">{t.averageScore}%</td>
                  <td className="py-4 px-4 font-mono text-rose-400">
                    {t.strugglingStudentsCount} ({t.percentageStruggling}%)
                  </td>
                  <td className="py-4 px-4">
                    <Badge variant={t.severity === 'Critical' ? 'danger' : 'warning'} size="sm">
                      {t.severity}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Company Readiness Matrix */}
      <Card className="p-6 bg-[#171716] border-gray-800 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-white">Readiness by company</h3>
            <p className="text-xs text-gray-400 mt-0.5">Real-time candidate readiness against visiting company cutoffs</p>
          </div>
          <Badge variant="accent">Campus Drives</Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-800 bg-[#1F1F1E]/50 text-gray-400 font-semibold">
                <th className="py-3.5 px-4">Recruiter</th>
                <th className="py-3.5 px-4">Drive Date</th>
                <th className="py-3.5 px-4">Eligible Students</th>
                <th className="py-3.5 px-4">Interview Ready</th>
                <th className="py-3.5 px-4">Readiness Rate</th>
                <th className="py-3.5 px-4">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {companyReadiness.map((c) => (
                <tr key={c.companyId} className="hover:bg-[#1F1F1E]/40 transition-colors">
                  <td className="py-4 px-4 font-bold text-gray-100">{c.companyName}</td>
                  <td className="py-4 px-4 font-mono text-gray-400">{c.visitingDate || 'Scheduled'}</td>
                  <td className="py-4 px-4 font-mono text-gray-300">{c.eligibleStudentsCount}</td>
                  <td className="py-4 px-4 font-mono font-bold text-emerald-400">{c.interviewReadyCount}</td>
                  <td className="py-4 px-4">
                    <div className="w-28 space-y-1">
                      <div className="font-mono text-amber-400 font-bold">{c.readinessPercentage}%</div>
                      <ProgressBar value={c.readinessPercentage} color="warning" size="sm" />
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-emerald-400 font-medium capitalize">{c.trend}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
