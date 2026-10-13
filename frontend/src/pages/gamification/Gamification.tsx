import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../../api/dashboard';
import { getFriendlyErrorMessage } from '../../api/client';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import {
  Flame,
  Trophy,
  Lock,
  Mic,
  Zap,
  Star,
  FileText,
  Award,
} from '../../components/icons';

// Badge icon names sent by the API, rendered as line icons
const BADGE_ICONS: Record<string, React.ElementType> = { mic: Mic, flame: Flame, zap: Zap, star: Star, file: FileText, trophy: Trophy };

export const Gamification: React.FC = () => {

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['gamification'],
    queryFn: () => dashboardApi.getGamification(),
  });
  const badges = data?.badges ?? [];
  const leaderboard = data?.leaderboard ?? [];

  if (isError) {
    return <div className="max-w-5xl mx-auto py-16 text-center text-sm text-rose-300">{getFriendlyErrorMessage(error)}</div>;
  }
  if (isLoading || !data) {
    return <div className="max-w-5xl mx-auto py-16 text-center text-xs text-gray-400">Loading achievements…</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Header Banner */}
      <div className="p-8 rounded-xl bg-[#1F1F1E] border border-brand-500/30 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-white">Badges and XP</h1>
          <p className="text-xs text-gray-400">
            XP and badges you have earned from interviews, tests and daily questions.
          </p>
        </div>

        {/* Current Level Card */}
        <div className="p-5 bg-[#171716] border border-gray-800 rounded-lg flex items-center space-x-4 shrink-0 shadow-lg">
          <div className="w-12 h-12 rounded-lg bg-brand-600 flex items-center justify-center text-white text-xl font-bold">
            {data.level}
          </div>
          <div>
            <div className="text-xs text-gray-400 font-semibold">Level Title</div>
            <div className="text-base font-semibold text-white">{data.levelTitle}</div>
            <div className="text-[11px] font-mono text-brand-400 mt-0.5">{data.totalXp} Total XP • {data.xpToNextLevel} XP to next level</div>
          </div>
        </div>
      </div>

      {/* Badges Grid */}
      <Card className="p-6 bg-[#171716] border-gray-800 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <h3 className="text-base font-bold text-white">Verified Placement Badges</h3>
          <span className="text-xs text-gray-400">{badges.filter((b) => b.unlocked).length} of {badges.length} Unlocked</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {badges.map((b) => (
            <div
              key={b.id}
              className={`p-5 rounded-lg border flex items-start space-x-4 transition-all ${
                b.unlocked
                  ? 'bg-[#1F1F1E] border-brand-500/30 shadow-md'
                  : 'bg-[#171716]/60 border-gray-800/80 opacity-50'
              }`}
            >
              <div className="shrink-0 w-9 h-9 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
                {React.createElement(BADGE_ICONS[b.icon] || Award, { className: 'w-4 h-4' })}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-bold text-white">{b.title}</h4>
                  {!b.unlocked && <Lock className="w-3 h-3 text-gray-500" />}
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Placement Batch Leaderboard */}
      <Card className="p-6 bg-[#171716] border-gray-800 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-white">Engineering Placement Leaderboard</h3>
            <p className="text-xs text-gray-400 mt-0.5">Top PrepAI students ranked by total XP</p>
          </div>
          <Badge variant="accent">Live</Badge>
        </div>

        <div className="space-y-2">
          {leaderboard.map((cand) => (
            <div
              key={`${cand.rank}-${cand.name}`}
              className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                cand.isUser
                  ? 'bg-brand-950/20 border-brand-500/50 shadow-md'
                  : 'bg-[#1F1F1E] border-gray-800'
              }`}
            >
              <div className="flex items-center space-x-4">
                <span
                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${
                    cand.rank === 1
                      ? 'bg-amber-500 text-black'
                      : cand.rank === 2
                      ? 'bg-gray-300 text-black'
                      : cand.rank === 3
                      ? 'bg-amber-700 text-white'
                      : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  #{cand.rank}
                </span>
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    {cand.name}
                    {cand.isUser && (
                      <span className="text-[11px] font-bold bg-brand-500/20 text-brand-400 px-1.5 py-0.2 rounded border border-brand-500/30">
                        You
                      </span>
                    )}
                  </h4>
                  <span className="text-[11px] text-gray-400">{cand.college}</span>
                </div>
              </div>

              <div className="flex items-center space-x-6">
                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-brand-300">{cand.score === null ? 'Private' : `${cand.score}% Score`}</div>
                  <div className="text-[11px] text-gray-400 font-mono">{cand.xp} XP</div>
                </div>
                <div className="flex items-center space-x-1 text-orange-400 text-xs font-mono font-bold">
                  <Flame className="w-3.5 h-3.5" />
                  <span>{cand.streak}d</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
