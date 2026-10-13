import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { interviewApi, ReportProcessingError } from '../../api/interview';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { getGradeBadgeClass } from '../../lib/formatters';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer
} from 'recharts';
import { GraduationCap, ArrowRight } from '../../components/icons';
import { ThemeToggle } from '../../components/ui/ThemeToggle';

export const SharedReport: React.FC = () => {
  const { token = '' } = useParams<{ token: string }>();

  const { data: report, isLoading, isError } = useQuery({
    queryKey: ['shared-report', token],
    queryFn: () => interviewApi.getSharedReport(token),
    retry: (count, err) => err instanceof ReportProcessingError && count < 60,
    retryDelay: 3000,
  });

  if (isError) {
    return (
      <div className="min-h-screen bg-[#121211] flex items-center justify-center text-center p-6">
        <div className="space-y-3">
          <h1 className="text-xl font-bold text-white">Shared report not found</h1>
          <p className="text-xs text-gray-400">This link is invalid or the report is no longer shared.</p>
          <Link to="/" className="text-xs text-brand-400 hover:underline">Go to PrepAI</Link>
        </div>
      </div>
    );
  }

  if (isLoading || !report) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const radarData = report.dimensions.map((d) => ({
    dimension: d.name,
    score: d.score,
    fullMark: 100,
  }));

  return (
    <div className="min-h-screen bg-[#121211] text-gray-100 p-6 md:p-12 font-sans selection:bg-brand-600 selection:text-white">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Brand Bar */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-4">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center text-white font-bold">
              <GraduationCap className="w-4 h-4" />
            </div>
            <span className="text-xl font-semibold text-white">Prep<span className="text-brand-400">AI</span></span>
          </Link>
          <div className="flex items-center space-x-3">
            <ThemeToggle size="sm" />
            <Badge variant="neutral">Verified Candidate Report (Read-Only)</Badge>
          </div>
        </div>

        {/* Hero Card */}
        <Card className="p-8 bg-[#171716] border-gray-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${getGradeBadgeClass(report.grade)}`}>
                Grade {report.grade}
              </span>
              <h1 className="text-2xl sm:text-3xl font-semibold text-white mt-2">
                {report.jobRole} mock interview
              </h1>
              <p className="text-xs text-gray-400 mt-1">
                Completed with {report.persona} ({report.interviewType})
              </p>
            </div>

            <div className="text-right sm:border-l sm:border-gray-800 sm:pl-6">
              <div className="text-xs text-gray-400 font-semibold">Placement Score</div>
              <div className="text-4xl font-semibold text-brand-400 font-mono mt-0.5">
                {report.overallScore}/100
              </div>
            </div>
          </div>
        </Card>

        {/* Radar & Dimensions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <Card className="p-6 bg-[#171716] border-gray-800 flex flex-col items-center">
            <h3 className="text-xs font-bold text-gray-300 mb-2 self-start">
              7D Competency Radar
            </h3>
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                  <PolarGrid stroke="#30302E" />
                  <PolarAngleAxis dataKey="dimension" stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#4B5563" />
                  <Radar dataKey="score" stroke="#4A76D9" fill="#4A76D9" fillOpacity={0.35} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-6 bg-[#171716] border-gray-800 space-y-3">
            <h3 className="text-xs font-bold text-gray-300 mb-2">
              Performance by Dimension
            </h3>
            {report.dimensions.map((dim, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-300 font-medium">{dim.name}</span>
                  <span className="font-mono text-brand-400 font-bold">{dim.score}%</span>
                </div>
                <ProgressBar value={dim.score} color={dim.score >= 80 ? 'accent' : 'warning'} size="sm" />
              </div>
            ))}
          </Card>
        </div>

        {/* Bottom CTA to join */}
        <div className="p-6 rounded-lg bg-[#1F1F1E] border border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <h4 className="text-sm font-bold text-white">Prepare for your engineering placements</h4>
            <p className="text-xs text-gray-400 mt-0.5">Practice interactive voice mock interviews with company-specific cutoffs.</p>
          </div>
          <Link to="/register">
            <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Try Free Interview
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
