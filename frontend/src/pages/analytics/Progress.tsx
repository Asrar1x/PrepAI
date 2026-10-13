import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../../api/dashboard';
import { getFriendlyErrorMessage } from '../../api/client';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import { TrendingUp } from '../../components/icons';

export const Progress: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['progress', timeRange],
    queryFn: () => dashboardApi.getProgress(timeRange),
  });
  const progressTimelineData = data?.timeline ?? [];
  const categoryMasteryData = data?.categoryAccuracy ?? [];
  const kpis = data?.kpis;
  const fmtPct = (v: number | null | undefined) => (v === null || v === undefined ? 'N/A' : `${v}%`);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="p-8 rounded-xl bg-[#1F1F1E] border border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-white">Your progress</h1>
          <p className="text-xs text-gray-400">
            Interview and aptitude scores over time, and how ready you are for your target role.
          </p>
        </div>

        {/* Date Filter Pills */}
        <div className="flex items-center space-x-1.5 p-1 bg-[#171716] border border-gray-800 rounded-xl">
          {(['7d', '30d', '90d', 'all'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                timeRange === r
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {isError && <p className="text-sm text-rose-300">{getFriendlyErrorMessage(error)}</p>}
      {isLoading && <p className="text-xs text-gray-400">Loading progress analytics…</p>}
      {data && progressTimelineData.length === 0 && (
        <p className="text-xs text-gray-400">No completed aptitude tests or mock interviews in this period yet.</p>
      )}

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-5 bg-[#171716] border-gray-800 space-y-1">
          <div className="text-[11px] text-gray-400 font-semibold">Average Mock Score</div>
          <div className="text-2xl font-semibold text-brand-400 font-mono">{fmtPct(kpis?.averageMockScore)}</div>
          <p className={`text-[11px] flex items-center gap-1 font-semibold ${(kpis?.mockScoreDelta ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            <TrendingUp className="w-3 h-3" />
            {kpis?.mockScoreDelta === null || kpis?.mockScoreDelta === undefined
              ? 'No earlier period to compare'
              : `${kpis.mockScoreDelta >= 0 ? '+' : ''}${kpis.mockScoreDelta} pts vs previous period`}
          </p>
        </Card>

        <Card className="p-5 bg-[#171716] border-gray-800 space-y-1">
          <div className="text-[11px] text-gray-400 font-semibold">Average Aptitude Score</div>
          <div className="text-2xl font-semibold text-emerald-400 font-mono">{fmtPct(kpis?.averageAptitudeScore)}</div>
          <p className="text-[11px] text-gray-400">{kpis?.aptitudeTests ?? 0} test(s) in this period</p>
        </Card>

        <Card className="p-5 bg-[#171716] border-gray-800 space-y-1">
          <div className="text-[11px] text-gray-400 font-semibold">Interview Hours</div>
          <div className="text-2xl font-semibold text-brand-400 font-mono">{((kpis?.interviewMinutes ?? 0) / 60).toFixed(1)} hrs</div>
          <p className="text-[11px] text-gray-400">{kpis?.mockRounds ?? 0} mock round(s) completed</p>
        </Card>

        <Card className="p-5 bg-[#171716] border-gray-800 space-y-1">
          <div className="text-[11px] text-gray-400 font-semibold">Cohort Percentile</div>
          <div className="text-2xl font-semibold text-amber-400 font-mono">{kpis?.percentile === null || kpis?.percentile === undefined ? 'N/A' : `${kpis.percentile}th`}</div>
          <p className="text-[11px] text-amber-300 font-semibold">Among {kpis?.cohortSize ?? 0} PrepAI student(s) with activity</p>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Trend Over Time */}
        <Card className="p-6 bg-[#171716] border-gray-800 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-800 pb-3">
            <h3 className="text-sm font-bold text-gray-200">
              Skill Acceleration Curves
            </h3>
            <Badge variant="accent" size="sm">Interview vs Aptitude</Badge>
          </div>

          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={progressTimelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2B2B29" />
                <XAxis dataKey="date" stroke="#6B7280" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} stroke="#6B7280" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: '#1F1F1E', borderColor: '#374151', borderRadius: '12px' }} />
                <Line type="monotone" dataKey="interview" name="Mock Interview Score" stroke="#4A76D9" strokeWidth={3} connectNulls />
                <Line type="monotone" dataKey="aptitude" name="Aptitude Score" stroke="#10B981" strokeWidth={2} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Sectional Accuracy Histogram */}
        <Card className="p-6 bg-[#171716] border-gray-800 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-800 pb-3">
            <h3 className="text-sm font-bold text-gray-200">
              Accuracy by Assessment Category
            </h3>
            <span className="text-xs text-gray-400 font-mono">Benchmark: 80%</span>
          </div>

          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryMasteryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2B2B29" />
                <XAxis dataKey="name" stroke="#6B7280" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} stroke="#6B7280" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: '#1F1F1E', borderColor: '#374151', borderRadius: '12px' }} />
                <Bar dataKey="accuracy" name="Accuracy %" fill="#4A76D9" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
};
