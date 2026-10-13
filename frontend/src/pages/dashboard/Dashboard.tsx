import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboardApi } from '../../api/dashboard';
import { useAuthStore } from '../../store/authStore';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ProgressBar } from '../../components/ui/ProgressBar';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import {
  TrendingUp,
  Flame,
  BookOpen,
  Mic,
  Building,
  CheckSquare,
  Square,
  Sparkles,
  ArrowUpRight,
  Zap,
  Target
} from '../../components/icons';
import toast from 'react-hot-toast';

export const Dashboard: React.FC = () => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['student-dashboard'],
    queryFn: () => dashboardApi.getDashboard(),
  });

  const toggleTaskMutation = useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) =>
      dashboardApi.toggleStudyPlanTask(id, completed),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-dashboard'] });
      toast.success('Study plan updated');
    },
  });

  if (isLoading || !dashboard) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="relative w-12 h-12 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-brand-500/20" />
            <div className="w-12 h-12 rounded-full border-4 border-brand-500 border-t-transparent animate-spin" />
            <Sparkles className="w-4 h-4 text-brand-400 absolute inset-0 m-auto animate-pulse" />
          </div>
          <p className="text-xs text-gray-400 font-medium">Loading candidate analytics...</p>
        </div>
      </div>
    );
  }

  const {
    readiness,
    scoreTimeline,
    topicHeatmap,
    companyReadiness,
    studyPlan,
    gamification,
    recentSessions,
    aiDailyDigest
  } = dashboard;

  const handleToggleTask = (taskId: string, currentStatus: boolean) => {
    toggleTaskMutation.mutate({ id: taskId, completed: !currentStatus });
  };

  return (
    <div className="space-y-8 pb-16">
      {/* 1. Welcome Hero Banner */}
      <div className="relative rounded-xl bg-[#1E1E1C] border border-[#353532] p-7 sm:p-9 overflow-hidden">

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2.5">
            <h1 className="text-2xl sm:text-4xl font-semibold text-[#F2F2EF] tracking-tight">
              Welcome back,{' '}
              {user?.name || dashboard.studentName}
            </h1>

            <p className="text-xs sm:text-sm text-gray-400 max-w-2xl leading-relaxed">
              Targeting <span className="text-gray-100 font-semibold">{dashboard.targetRole}</span>
              {dashboard.targetCompany && (
                <>
                  {' '}at <span className="text-brand-300 font-semibold">{dashboard.targetCompany}</span>
                </>
              )}
              .
              {dashboard.placementCountdownDays !== null && dashboard.placementCountdownDays !== undefined && (
                <span className="ml-2 inline-flex items-center gap-1 text-amber-300 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded-md font-mono text-xs font-semibold">
                  <Target className="w-3 h-3 text-amber-400" />
                  {dashboard.placementCountdownDays} days to drive
                </span>
              )}
            </p>
          </div>

          {/* Quick Primary Actions */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link to="/interview">
              <Button
                variant="primary"
                size="md"
                leftIcon={<Mic className="w-4 h-4" />}
               
              >
                Start a mock interview
              </Button>
            </Link>
            <Link to="/aptitude">
              <Button
                variant="glass"
                size="md"
                leftIcon={<BookOpen className="w-4 h-4" />}
              >
                Take an aptitude test
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Top Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Composite Readiness Score */}
        <Card variant="premium" hoverEffect className="p-6 space-y-3.5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400">
              Readiness
            </span>
            {readiness.delta !== 0 && (
              <Badge variant={readiness.delta > 0 ? 'success' : 'warning'} size="sm" dot>
                <TrendingUp className={`w-3 h-3 mr-1 inline ${readiness.delta < 0 ? 'rotate-180' : ''}`} />
                {readiness.delta > 0 ? '+' : ''}{readiness.delta} pts
              </Badge>
            )}
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-4xl sm:text-5xl font-semibold text-white tracking-tight">
              {readiness.score}
            </span>
            <span className="text-sm text-gray-500 font-mono font-medium">/ 100</span>
          </div>
          <p className="text-xs text-gray-400">
            {readiness.statusLabel === 'Not Started' ? (
              'Complete a test or mock interview to get your readiness score.'
            ) : (
              <>
                Percentile: <span className="text-brand-400 font-bold font-mono">{readiness.percentileRank}th</span> among{' '}
                {readiness.cohortSize ?? 0} active student(s)
              </>
            )}
          </p>
          <ProgressBar value={readiness.score} color="accent" size="sm" />
        </Card>

        {/* Streak & XP Gamification */}
        <Card variant="premium" hoverEffect className="p-6 space-y-3.5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400">
              Streak and XP
            </span>
            <div className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-md bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-bold font-mono">
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              <span>{gamification.currentStreak} Days</span>
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-4xl sm:text-5xl font-semibold text-amber-300 tracking-tight">
              {gamification.totalXp}
            </span>
            <span className="text-xs text-gray-400 font-medium">XP (Level {gamification.level})</span>
          </div>
          <p className="text-xs text-gray-400">
            Next badge: <span className="text-gray-200 font-semibold">{gamification.nextMilestoneTitle}</span>
          </p>
          <ProgressBar value={gamification.levelProgress ?? 0} color="warning" size="sm" />
        </Card>

        {/* AI Daily Digest */}
        <Card className="p-6 bg-[#1F2B47]/50 border border-brand-500/30 space-y-2.5 relative overflow-hidden hover:border-brand-500/50 transition-all">
          <div className="flex items-center space-x-2 text-brand-400">
            <span className="text-xs font-bold">
              Suggested next step
            </span>
          </div>
          <h4 className="text-xs font-bold text-gray-100 leading-snug">
            {aiDailyDigest.headline}
          </h4>
          <p className="text-[11px] text-gray-300 leading-relaxed">
            {aiDailyDigest.recommendedAction}
          </p>
          <div className="text-[11px] text-orange-300/90 font-medium pt-1 flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-orange-400" />
            <span>{aiDailyDigest.streakMotivation}</span>
          </div>
        </Card>
      </div>

      {/* 3. Middle Section: Score Timeline & Study Plan Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Score Timeline Line Chart */}
        <Card variant="premium" className="lg:col-span-7 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#353532]/80 pb-3">
            <div>
              <h3 className="text-sm font-bold text-gray-100">
                Scores over time
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">Interview and aptitude scores from your own sessions</p>
            </div>
          </div>

          <div className="w-full h-64 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={scoreTimeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#353532" opacity={0.4} />
                <XAxis dataKey="date" stroke="#6B7280" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} stroke="#6B7280" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1A1A19',
                    borderColor: '#353532',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#F2F2EF',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="interviewScore"
                  name="Mock Interview Score"
                  connectNulls
                  stroke="#4A76D9"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#4A76D9', stroke: '#1A1A19', strokeWidth: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="aptitudeScore"
                  name="Aptitude Score"
                  connectNulls
                  stroke="#10B981"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 3, fill: '#10B981', stroke: '#1A1A19', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Study Plan Checklist */}
        <Card variant="premium" className="lg:col-span-5 p-6 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#353532]/80 pb-3 mb-3">
              <div>
                <h3 className="text-sm font-bold text-gray-100">
                  Today's Study Plan
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {studyPlan.daysAheadOrBehind >= 0
                    ? `On track (${studyPlan.daysAheadOrBehind} days ahead)`
                    : 'Behind schedule'}
                </p>
              </div>
              <span className="text-xs font-mono text-brand-400 font-bold px-2 py-0.5 rounded-md bg-brand-500/10 border border-brand-500/20">
                {studyPlan.totalProgressPercentage}% Overall
              </span>
            </div>

            <div className="space-y-2.5">
              {studyPlan.todayTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => handleToggleTask(task.id, task.isCompleted)}
                  className={`p-3 rounded-xl border flex items-start space-x-3 cursor-pointer transition-all duration-200 ${
                    task.isCompleted
                      ? 'bg-emerald-950/20 border-emerald-500/30 text-gray-400'
                      : 'bg-[#1E1E1C]/60 border-[#353532] hover:border-brand-500/40 hover:bg-[#1E1E1C]'
                  }`}
                >
                  <button
                    type="button"
                    className="mt-0.5 text-brand-400 shrink-0"
                    aria-label={`${task.isCompleted ? 'Mark as not done' : 'Mark as done'}: ${task.topic}`}
                    aria-pressed={task.isCompleted}
                  >
                    {task.isCompleted ? (
                      <CheckSquare className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-xs font-semibold ${
                        task.isCompleted ? 'line-through text-gray-400' : 'text-gray-200'
                      }`}
                    >
                      {task.topic}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5 truncate">{task.description}</p>
                  </div>
                  <span className="text-[11px] font-mono text-gray-500 shrink-0">
                    {task.durationMinutes}m
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-[#353532]/80">
            <Link to="/roles/software-development-engineer/gap">
              <Button variant="ghost" size="sm" className="w-full text-xs text-brand-400 hover:text-brand-300">
                Rebuild study plan
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      {/* 4. Company Readiness Matrix & Topic Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Company Readiness Cards */}
        <Card variant="premium" className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#353532]/80 pb-3">
            <div className="flex items-center space-x-2">
              <Building className="w-5 h-5 text-brand-400" />
              <h3 className="text-base font-bold text-white">Company cutoffs</h3>
            </div>
            <Link to="/companies" className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 font-medium">
              View all formats <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {companyReadiness.length === 0 && (
              <p className="text-xs text-gray-500 py-4">No company-pattern tests or interviews yet. Pick a target company in an aptitude test or mock interview.</p>
            )}
            {companyReadiness.map((comp) => (
              <div
                key={comp.companyId}
                className="p-4 rounded-xl bg-[#1E1E1C]/60 border border-[#353532] hover:border-brand-500/40 transition-all flex items-center justify-between"
              >
                <div>
                  <h4 className="text-xs font-bold text-gray-200">{comp.companyName}</h4>
                  <div className="text-[11px] text-gray-400 mt-0.5">
                    {comp.practiceCount} Mock Assessments Taken
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-brand-400 font-mono">
                    {comp.readinessPercentage}% Ready
                  </div>
                  <span className="text-[11px] text-emerald-400 font-medium">Cutoff: {comp.cutoffConfidence}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Topic Mastery Heatmap */}
        <Card variant="premium" className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#353532]/80 pb-3">
            <h3 className="text-base font-bold text-white">Topic strength</h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {topicHeatmap.length === 0 && (
              <p className="text-xs text-gray-500 py-4">Topic mastery appears after your first aptitude test or mock interview.</p>
            )}
            {topicHeatmap.map((item, idx) => (
              <div
                key={idx}
                className={`p-3.5 rounded-xl border text-center transition-all ${
                  item.status === 'Strong'
                    ? 'bg-emerald-950/20 border-emerald-500/35 text-emerald-200'
                    : item.status === 'Average'
                    ? 'bg-amber-950/20 border-amber-500/35 text-amber-200'
                    : 'bg-rose-950/20 border-rose-500/35 text-rose-200'
                }`}
              >
                <div className="text-[11px] font-bold truncate">{item.topic}</div>
                <div className="text-base font-semibold font-mono mt-1">{item.score}%</div>
                <div className="text-[11px] opacity-75 mt-0.5 font-semibold">
                  {item.status}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* 5. Recent Session History */}
      <Card variant="premium" className="p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#353532]/80 pb-3">
          <h3 className="text-base font-bold text-white">Recent sessions</h3>
          <Link to="/report/latest" className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 font-medium">
            Latest report <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="space-y-3">
          {recentSessions.length === 0 && (
            <p className="text-xs text-gray-500 py-4">No practice sessions yet.</p>
          )}
          {recentSessions.map((session) => (
            <div
              key={session.id}
              className="p-4 rounded-xl bg-[#1E1E1C]/60 border border-[#353532] hover:border-brand-500/30 transition-all flex items-center justify-between text-xs"
            >
              <div className="flex items-center space-x-3.5">
                <span
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shadow-md ${
                    session.type === 'Interview'
                      ? 'bg-brand-600/20 text-brand-300 border border-brand-500/35'
                      : 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/35'
                  }`}
                >
                  {session.type === 'Interview' ? <Mic className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                </span>
                <div>
                  <h4 className="font-bold text-gray-200">{session.title}</h4>
                  <span className="text-[11px] text-gray-400">{session.date}</span>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <span className="font-mono font-semibold text-brand-400 text-sm">
                  {session.score}%
                </span>
                <Link to={session.type === 'Interview' ? `/report/${session.id}` : `/aptitude/${session.id}/results`}>
                  <Button variant="ghost" size="sm" className="text-brand-400 hover:text-brand-300">
                    Review
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

