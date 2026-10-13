import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getFriendlyErrorMessage } from '../../api/client';
import { aptitudeApi } from '../../api/aptitude';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Clock, Award, ArrowRight } from '../../components/icons';
import toast from 'react-hot-toast';

export const DailyQuest: React.FC = () => {
  const navigate = useNavigate();

  const { data: quest, isLoading, isError, error } = useQuery({
    queryKey: ['daily-quest'],
    queryFn: () => aptitudeApi.getDailyQuest(),
  });

  const startMutation = useMutation({
    mutationFn: () =>
      aptitudeApi.startSession({ jobRole: 'Software Developer (SDE)', companyPattern: 'standard', durationMinutes: 15, mode: 'daily' }),
    onSuccess: (session) => {
      toast.success('Daily quest started! Focus on speed.');
      navigate(`/aptitude/${session.sessionId}`);
    },
    onError: (err) => toast.error(getFriendlyErrorMessage(err)),
  });

  const handleStartQuest = () => {
    if (quest?.isCompleted && quest.sessionId) {
      navigate(`/aptitude/${quest.sessionId}/results`);
      return;
    }
    startMutation.mutate();
  };

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-sm text-rose-300">
        {getFriendlyErrorMessage(error)}
      </div>
    );
  }

  if (isLoading || !quest) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="p-8 rounded-xl bg-[#1F1F1E] border border-orange-500/30 relative overflow-hidden">
        <div className="space-y-3 relative z-10">
          <h1 className="text-3xl font-semibold text-white">{quest.title}</h1>
          <p className="text-xs text-gray-300 max-w-lg leading-relaxed">
            Five short questions a day. Finish today's set to keep your streak going and earn XP.
          </p>
        </div>
      </div>

      {/* Quest Details Card */}
      <Card className="p-8 bg-[#171716] border-gray-800 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-[#1F1F1E] border border-gray-700/60 text-center">
            <div className="text-xs text-gray-400 font-semibold">Category</div>
            <div className="text-sm font-bold text-white mt-1">{quest.category}</div>
          </div>
          <div className="p-4 rounded-xl bg-[#1F1F1E] border border-gray-700/60 text-center">
            <div className="text-xs text-gray-400 font-semibold">XP Reward</div>
            <div className="text-lg font-semibold text-amber-400 font-mono mt-1 flex items-center justify-center gap-1">
              <Award className="w-4 h-4" /> +{quest.xpReward} XP
            </div>
          </div>
          <div className="p-4 rounded-xl bg-[#1F1F1E] border border-gray-700/60 text-center">
            <div className="text-xs text-gray-400 font-semibold">Expires In</div>
            <div className="text-sm font-bold text-rose-400 font-mono mt-1 flex items-center justify-center gap-1">
              <Clock className="w-4 h-4" /> {quest.expiresInHours} Hours
            </div>
          </div>
        </div>

        {/* Progress Display */}
        <div className="space-y-2 p-5 bg-[#1F1F1E]/50 rounded-lg border border-gray-800">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-gray-300">Quest Progress</span>
            <span className="font-mono text-brand-400 font-bold">
              {quest.completedQuestions} of {quest.questionCount} Questions Solved
            </span>
          </div>
          <ProgressBar
            value={quest.completedQuestions}
            max={quest.questionCount}
            color="accent"
            size="md"
          />
        </div>

        <div className="pt-2 flex justify-end">
          <Button
            variant="primary"
            size="lg"
            onClick={handleStartQuest}
            isLoading={startMutation.isPending}
            rightIcon={<ArrowRight className="w-4 h-4" />}
            className="w-full sm:w-auto bg-orange-600 border-orange-500/40"
          >
            {quest.isCompleted ? "View Today's Results" : `Start Daily Quest (${quest.questionCount} Questions)`}
          </Button>
        </div>
      </Card>
    </div>
  );
};
