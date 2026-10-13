import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../api/admin';
import { getFriendlyErrorMessage } from '../../api/client';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import { Rocket, UploadCloud } from '../../components/icons';
import { Link } from 'react-router-dom';

export const AdminDashboard: React.FC = () => {
  const { data: analytics, isLoading, isError, error } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: () => adminApi.getBatchAnalytics(),
  });

  if (isError) {
    return <div className="py-20 text-center text-sm text-rose-300">{getFriendlyErrorMessage(error)}</div>;
  }

  if (isLoading || !analytics) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const metrics = analytics.metrics;
  const scoreDistribution = analytics.scoreDistribution || [];
  const weakTopics = analytics.weakTopics || [];
  const companyReadiness = analytics.companyReadiness || [];

  return (
    <div className="space-y-8 pb-16">
      {/* Admin Header */}
      <div className="p-8 rounded-xl bg-[#1F1F1E] border border-amber-500/30 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-white">Placement overview</h1>
          <p className="text-xs text-gray-400">
            Readiness, test scores and weak topics for every batch, taken from students' own sessions.
          </p>
        </div>

        {/* Quick Admin Navigation */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Link to="/admin/drives">
            <Button variant="primary" size="md" leftIcon={<Rocket className="w-4 h-4" />} className="bg-amber-700 hover:bg-amber-800 border-amber-500/40">
              Activate Drive Mode
            </Button>
          </Link>
          <Link to="/admin/questions/upload">
            <Button variant="secondary" size="md" leftIcon={<UploadCloud className="w-4 h-4 text-amber-400" />}>
              Upload Questions
            </Button>
          </Link>
        </div>
      </div>

      {/* Top 5 Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card className="p-5 bg-[#171716] border-gray-800 space-y-1">
          <div className="text-[11px] text-gray-400 font-semibold">Registered Cohort</div>
          <div className="text-2xl font-semibold text-white font-mono">{metrics.totalRegistered}</div>
          <p className="text-[11px] text-gray-500">Registered students (all batches)</p>
        </Card>

        <Card className="p-5 bg-[#171716] border-gray-800 space-y-1">
          <div className="text-[11px] text-gray-400 font-semibold">Active This Week</div>
          <div className="text-2xl font-semibold text-brand-400 font-mono">{metrics.activeThisWeek}</div>
          <p className="text-[11px] text-emerald-400 font-semibold">{metrics.totalRegistered ? Math.round((metrics.activeThisWeek / metrics.totalRegistered) * 100) : 0}% Engagement Rate</p>
        </Card>

        <Card className="p-5 bg-[#171716] border-gray-800 space-y-1">
          <div className="text-[11px] text-gray-400 font-semibold">Avg Mock Score</div>
          <div className="text-2xl font-semibold text-emerald-400 font-mono">{metrics.averageInterviewScore}%</div>
          <p className="text-[11px] text-gray-500">Completed mock interviews</p>
        </Card>

        <Card className="p-5 bg-[#171716] border-gray-800 space-y-1">
          <div className="text-[11px] text-gray-400 font-semibold">Aptitude Avg</div>
          <div className="text-2xl font-semibold text-amber-400 font-mono">{metrics.averageAptitudeScore}%</div>
          <p className="text-[11px] text-gray-500">Completed aptitude tests</p>
        </Card>

        <Card className="p-5 bg-[#171716] border-gray-800 space-y-1">
          <div className="text-[11px] text-gray-400 font-semibold">Ready for Placement</div>
          <div className="text-2xl font-semibold text-white font-mono">{metrics.placementReadinessRate}%</div>
          <p className="text-[11px] text-emerald-400 font-semibold">{Math.round((metrics.placementReadinessRate / 100) * metrics.totalRegistered)} student(s) at 70%+ readiness</p>
        </Card>
      </div>

      {/* Middle Section: Score Distribution Histogram & Company Readiness */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Score Distribution Histogram */}
        <Card className="lg:col-span-7 p-6 bg-[#171716] border-gray-800 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-800 pb-3">
            <h3 className="text-sm font-bold text-gray-200">
              Batch Performance Distribution
            </h3>
            <span className="text-xs text-gray-400">Scores across 0 - 100</span>
          </div>

          <div className="w-full h-64 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scoreDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2B2B29" />
                <XAxis dataKey="scoreRange" stroke="#6B7280" tick={{ fontSize: 11 }} />
                <YAxis stroke="#6B7280" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: '#1F1F1E', borderColor: '#374151', borderRadius: '12px' }} />
                <Bar dataKey="studentCount" name="Student Count" fill="#F59E0B" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Company Readiness Overview */}
        <Card className="lg:col-span-5 p-6 bg-[#171716] border-gray-800 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-800 pb-3">
            <h3 className="text-sm font-bold text-gray-200">
              Visiting Recruiters Cutoffs
            </h3>
            <Link to="/admin/drives" className="text-xs text-amber-400 hover:text-amber-300">
              Manage Drives
            </Link>
          </div>

          <div className="space-y-3">
            {companyReadiness.map((c) => (
              <div
                key={c.companyId}
                className="p-3.5 rounded-xl bg-[#1F1F1E] border border-gray-800 flex items-center justify-between"
              >
                <div>
                  <h4 className="text-xs font-bold text-gray-200">{c.companyName}</h4>
                  <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                    Visit: {c.visitingDate || 'Date not set'} • {c.interviewReadyCount} / {c.eligibleStudentsCount} Ready
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-amber-400 font-mono">{c.readinessPercentage}%</div>
                  <span className="text-[11px] text-emerald-400 font-medium">{c.trend}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Weak Topic Matrix Preview */}
      <Card className="p-6 bg-[#171716] border-gray-800 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-white">Weak topics by batch</h3>
            <p className="text-xs text-gray-400 mt-0.5">Areas where more than 30% of students struggle</p>
          </div>
          <Link to="/admin/batches">
            <Button variant="ghost" size="sm" className="text-amber-400">
              Detailed Breakdown
            </Button>
          </Link>
        </div>

        <div className="space-y-3">
          {weakTopics.map((topic, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-[#1F1F1E] border border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-200">{topic.topic}</span>
                  <Badge variant={topic.severity === 'Critical' ? 'danger' : 'warning'} size="sm">
                    {topic.severity}
                  </Badge>
                </div>
                <span className="text-[11px] text-gray-400 font-mono">{topic.category}</span>
              </div>

              <div className="flex items-center space-x-6">
                <div>
                  <span className="text-[11px] text-gray-500">Avg Score</span>
                  <div className="font-bold font-mono text-gray-300">{topic.averageScore}%</div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-gray-500">Struggling Students</span>
                  <div className="font-bold font-mono text-rose-400">{topic.strugglingStudentsCount} ({topic.percentageStruggling}%)</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
