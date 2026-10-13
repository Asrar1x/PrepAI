import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { rolesApi } from '../../api/roles';
import { SkillProficiency, SkillGapAnalysisResponse } from '../../types/role';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ArrowRight } from '../../components/icons';
import toast from 'react-hot-toast';

const FALLBACK_SKILLS = [
  'Data Structures & Algorithms',
  'System Design & Scalability',
  'Database Management & SQL',
  'RESTful API Architecture',
  'Concurrency & Multi-threading',
  'Structured Problem Solving'
];

export const SkillGapAnalyzer: React.FC = () => {
  const { roleSlug = 'software-development-engineer' } = useParams<{ roleSlug: string }>();

  const { data: role } = useQuery({
    queryKey: ['role', roleSlug],
    queryFn: () => rolesApi.getRoleBySlug(roleSlug),
  });

  // Only the student's own choices are stored; unrated skills read as neutral "okay"
  const [ratings, setRatings] = useState<Record<string, SkillProficiency>>({});

  const [analysisResult, setAnalysisResult] = useState<SkillGapAnalysisResponse | null>(null);

  // Rate the selected role's own skills; the generic list is only a fallback while the role loads
  const skillsList = role?.skills?.length ? role.skills : FALLBACK_SKILLS;
  const ratingOf = (skill: string): SkillProficiency => ratings[skill] || 'okay';

  const mutation = useMutation({
    mutationFn: () => rolesApi.analyzeSkillGap({
      roleSlug,
      skillRatings: Object.fromEntries(skillsList.map(skill => [skill, ratingOf(skill)]))
    }),
    onSuccess: (data) => {
      setAnalysisResult(data);
      toast.success('Study plan created');
    },
    onError: () => {
      toast.error('Failed to generate study plan.');
    }
  });

  const handleRating = (skillName: string, level: SkillProficiency) => {
    setRatings(prev => ({ ...prev, [skillName]: level }));
  };

  const shown = skillsList.map(ratingOf);
  const strongCount = shown.filter(r => r === 'strong').length;
  const okayCount = shown.filter(r => r === 'okay').length;
  const weakCount = shown.filter(r => r === 'weak').length;
  const scoreEstimate = Math.round(((strongCount * 100) + (okayCount * 60) + (weakCount * 20)) / skillsList.length);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="p-8 rounded-xl bg-[#1F1F1E] border border-gray-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-semibold text-white">
              {role?.title || 'Engineering Role'} skill check
            </h1>
            <p className="text-xs text-gray-400 max-w-xl">
              Rate yourself on each topic. PrepAI builds a daily study plan that starts with your weakest ones.
            </p>
          </div>

          <div className="p-4 bg-[#171716] border border-gray-800 rounded-lg text-center min-w-[140px]">
            <div className="text-xs text-gray-400 font-medium">Estimated Readiness</div>
            <div className="text-3xl font-semibold text-brand-400 font-mono mt-0.5">{scoreEstimate}%</div>
            <div className="text-[11px] text-gray-500 mt-1">
              {strongCount} Strong • {okayCount} Okay • {weakCount} Weak
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Skills Rating Grid */}
      {!analysisResult ? (
        <Card className="p-6 bg-[#171716] border-gray-800 space-y-6">
          <div className="flex items-center justify-between border-b border-gray-800 pb-4">
            <h3 className="text-base font-bold text-white">Self-Assess Your Competency</h3>
            <div className="flex items-center space-x-4 text-xs font-medium">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Strong (Ready)
              </span>
              <span className="flex items-center gap-1.5 text-amber-400">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Okay (Need practice)
              </span>
              <span className="flex items-center gap-1.5 text-rose-400">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Weak (High risk)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {skillsList.map((skill) => {
              const current = ratingOf(skill);
              return (
                <div
                  key={skill}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-[#1F1F1E]/70 border border-gray-800 hover:border-gray-700 transition-colors"
                >
                  <span className="text-xs font-semibold text-gray-200">{skill}</span>
                  <div className="flex items-center space-x-1.5 bg-[#171716] p-1 rounded-lg border border-gray-800">
                    <button
                      type="button"
                      onClick={() => handleRating(skill, 'strong')}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                        current === 'strong'
                          ? 'bg-emerald-500 text-white shadow-sm'
                          : 'text-gray-400 hover:text-emerald-400'
                      }`}
                    >
                      Strong
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRating(skill, 'okay')}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                        current === 'okay'
                          ? 'bg-amber-500 text-white shadow-sm'
                          : 'text-gray-400 hover:text-amber-400'
                      }`}
                    >
                      Okay
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRating(skill, 'weak')}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                        current === 'weak'
                          ? 'bg-rose-500 text-white shadow-sm'
                          : 'text-gray-400 hover:text-rose-400'
                      }`}
                    >
                      Weak
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 flex justify-end">
            <Button
              variant="primary"
              size="lg"
              isLoading={mutation.isPending}
              onClick={() => mutation.mutate()}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Generate Placement Study Plan
            </Button>
          </div>
        </Card>
      ) : (
        /* Generated Study Plan Preview */
        <Card className="p-8 bg-[#171716] border-brand-500/40 space-y-6">
          <div className="flex items-center justify-between border-b border-gray-800 pb-4">
            <div>
              <Badge variant="accent">Plan Generated</Badge>
              <h3 className="text-xl font-bold text-white mt-1">
                Personalized Placement Roadmap
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Targeting your {analysisResult.weaknesses.length} weak areas for {analysisResult.roleTitle}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="secondary" size="sm" onClick={() => setAnalysisResult(null)}>
                Recalibrate
              </Button>
              <Link to="/dashboard">
                <Button variant="primary" size="sm">
                  Save to Dashboard
                </Button>
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            {analysisResult.generatedStudyPlan.map((task) => (
              <div
                key={task.id}
                className="flex items-start space-x-4 p-4 rounded-xl bg-[#1F1F1E] border border-gray-700/60"
              >
                <div className="w-8 h-8 rounded-lg bg-brand-600/20 text-brand-400 border border-brand-500/30 flex items-center justify-center text-xs font-bold font-mono shrink-0">
                  D{task.dayNumber}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-gray-100">{task.topic}</h4>
                    <span className="text-xs font-mono text-gray-400">{task.estimatedMinutes} mins</span>
                  </div>
                  <p className="text-xs text-gray-400">{task.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 flex items-center justify-between">
            <span className="text-xs text-gray-400">
              Tasks will appear on your daily student dashboard checklist.
            </span>
            <Link to="/aptitude">
              <Button variant="outline" size="sm">
                Take Placement Aptitude Test
              </Button>
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
};
