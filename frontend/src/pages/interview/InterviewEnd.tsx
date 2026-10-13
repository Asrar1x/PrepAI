import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { interviewApi } from '../../api/interview';
import { formatDuration } from '../../lib/formatters';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ProgressBar } from '../../components/ui/ProgressBar';
import {
  CheckCircle2,
  Loader2,
  ArrowRight,
  Sparkles
} from '../../components/icons';

export const InterviewEnd: React.FC = () => {
  const { sessionId = 'latest' } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const { data: endedSession } = useQuery({
    queryKey: ['interview-session', sessionId],
    queryFn: () => interviewApi.getSession(sessionId),
  });
  const answerCount = endedSession ? endedSession.transcript.filter((t) => t.speaker === 'student').length : null;

  // Real report-generation progress: answers evaluated / answers given, then report status
  const { data: progressInfo } = useQuery({
    queryKey: ['interview-progress', sessionId],
    queryFn: () => interviewApi.getProgress(sessionId),
    refetchInterval: (query) => {
      const status = query.state.data?.reportStatus;
      return status === 'ready' || status === 'partial' || status === 'failed' ? false : 2000;
    },
  });

  const reportStatus = progressInfo?.reportStatus;
  const isReady = reportStatus === 'ready' || reportStatus === 'partial';
  const isFailed = reportStatus === 'failed';
  const total = progressInfo?.answersTotal ?? 0;
  const evaluated = progressInfo?.answersEvaluated ?? 0;
  // Evaluation of answers is 90% of the work; the remaining 10% is report assembly
  const progress = isReady || isFailed ? 100 : total > 0 ? Math.min(90, Math.round((evaluated / total) * 90)) : 5;
  const statusMessage = isReady
    ? 'Your report is ready'
    : isFailed
      ? progressInfo?.reportError || 'The report could not be generated. Open the report page to retry.'
      : total > 0
        ? `Evaluating your answers (${evaluated} of ${total})...`
        : 'Preparing your report...';

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-12 text-center pb-20">
      {/* Visual Avatar State */}
      <div className="relative inline-block">
        <div className={`w-24 h-24 rounded-xl bg-brand-600 flex items-center justify-center text-white mx-auto transition-all duration-500 ${
          isReady
            ? ' border border-brand-400/50'
            : ' animate-pulse'
        }`}>
          {isReady ? <CheckCircle2 className="w-12 h-12 text-white" /> : <Loader2 className="w-12 h-12 animate-spin text-white" />}
        </div>
        {isReady && (
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-400 border-2 border-[#0E0E0D] flex items-center justify-center shadow-lg">
            <Sparkles className="w-3.5 h-3.5 text-[#0E0E0D]" />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-semibold text-white tracking-tight">
          Interview finished
        </h1>
        <p className="text-xs sm:text-sm text-gray-400 max-w-md mx-auto leading-relaxed">
          {statusMessage}
        </p>
      </div>

      <Card variant="premium" className="p-8 space-y-6 text-left">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-[#1E1E1C]/70 border border-[#353532]">
            <div className="text-[11px] text-gray-400 font-bold">Total Duration</div>
            <div className="text-xl font-semibold text-gray-100 font-mono mt-1">{endedSession ? formatDuration(endedSession.durationSeconds || 0) : 'N/A'}</div>
          </div>
          <div className="p-4 rounded-xl bg-[#1E1E1C]/70 border border-[#353532]">
            <div className="text-[11px] text-gray-400 font-bold">Questions Answered</div>
            <div className="text-xl font-semibold text-brand-400 font-mono mt-1">{answerCount === null ? 'N/A' : `${answerCount} ${answerCount === 1 ? 'Answer' : 'Answers'}`}</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-gray-300">Report Synthesis</span>
            <span className="font-mono text-brand-400 font-bold">{progress}%</span>
          </div>
          <ProgressBar value={progress} color="accent" size="md" />
        </div>

        {/* CTAs */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3.5">
          <Link to="/dashboard" className="w-full sm:w-auto">
            <Button variant="ghost" size="md" className="w-full justify-center text-gray-300 hover:text-white">
              Back to Dashboard
            </Button>
          </Link>
          <Button
            variant="primary"
            size="lg"
            disabled={!isReady && !isFailed}
            onClick={() => navigate(`/report/${sessionId}`)}
            rightIcon={<ArrowRight className="w-4 h-4" />}
            className="w-full sm:w-auto"
          >
            {isReady ? 'View report' : isFailed ? 'Open Report Page' : 'Analyzing...'}
          </Button>
        </div>
      </Card>
    </div>
  );
};

