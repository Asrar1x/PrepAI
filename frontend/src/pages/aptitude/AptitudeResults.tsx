import React, { useState } from 'react';
import { useLocation, Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AptitudeResult } from '../../types/aptitude';
import { getFriendlyErrorMessage } from '../../api/client';
import { aptitudeApi } from '../../api/aptitude';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { formatDuration } from '../../lib/formatters';
import {
  CheckCircle2,
  XCircle,
  Flame,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  LayoutDashboard,
  Lightbulb,
  Zap,
} from '../../components/icons';

export const AptitudeResults: React.FC = () => {
  const location = useLocation();
  const { sessionId = '' } = useParams<{ sessionId: string }>();
  const stateResult = location.state?.result as AptitudeResult | undefined;

  const { data: serverResult, isLoading, isError, error } = useQuery({
    queryKey: ['aptitude-report', sessionId],
    queryFn: () => aptitudeApi.getResult(sessionId),
    enabled: !stateResult && !!sessionId
  });

  const result: AptitudeResult | undefined = stateResult || serverResult;

  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const toggleRow = (num: number) => {
    setExpandedRow(expandedRow === num ? null : num);
  };

  if (!result) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-sm text-gray-400">
        {isError ? getFriendlyErrorMessage(error) : isLoading ? 'Loading results…' : 'Results not found.'}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      {/* 1. Score Hero Summary */}
      <div className="relative p-7 sm:p-9 rounded-xl bg-[#1E1E1C] border border-[#353532] overflow-hidden">

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2.5">
            <h1 className="text-2xl sm:text-4xl font-semibold text-[#F2F2EF] tracking-tight">
              Aptitude test result
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 max-w-xl leading-relaxed">
              Your accuracy, time taken and weakest topics from this test.
            </p>
          </div>

          <div className="flex items-center space-x-6 bg-[#141413]/90 p-5 rounded-lg border border-[#353532] shrink-0">
            <div>
              <div className="text-xs text-gray-400 font-bold">Overall Score</div>
              <div className="text-4xl font-semibold text-brand-400 font-mono mt-0.5">
                {result.overallScorePercentage}%
              </div>
            </div>
            <div className="h-10 w-px bg-[#353532]" />
            <div>
              <div className="text-xs text-gray-400 font-bold">XP Earned</div>
              <div className="text-2xl font-semibold text-amber-300 font-mono flex items-center gap-1.5 mt-0.5">
                <Flame className="w-5 h-5 text-amber-400" /> +{result.xpEarned}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-[#353532]/80">
          <div className="p-4 bg-[#1A1A19]/80 rounded-lg border border-[#353532]">
            <div className="text-[11px] text-gray-400 font-bold">Correct</div>
            <div className="text-xl font-semibold text-emerald-400 font-mono mt-1">{result.correctCount} / {result.totalQuestions}</div>
          </div>
          <div className="p-4 bg-[#1A1A19]/80 rounded-lg border border-[#353532]">
            <div className="text-[11px] text-gray-400 font-bold">Incorrect</div>
            <div className="text-xl font-semibold text-rose-400 font-mono mt-1">{result.wrongCount}</div>
          </div>
          <div className="p-4 bg-[#1A1A19]/80 rounded-lg border border-[#353532]">
            <div className="text-[11px] text-gray-400 font-bold">Accuracy</div>
            <div className="text-xl font-semibold text-brand-300 font-mono mt-1">{result.accuracyPercentage}%</div>
          </div>
          <div className="p-4 bg-[#1A1A19]/80 rounded-lg border border-[#353532]">
            <div className="text-[11px] text-gray-400 font-bold">Time Used</div>
            <div className="text-xl font-semibold text-gray-200 font-mono mt-1">{formatDuration(result.timeUsedSeconds)}</div>
          </div>
        </div>
      </div>

      {/* 2. Category Accuracy Breakdown */}
      <Card variant="premium" className="p-6 space-y-4">
        <h3 className="text-base font-bold text-white border-b border-[#353532]/80 pb-3">
          Sectional Accuracy Breakdown
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {result.categoryBreakdown.map((cat, idx) => (
            <div key={idx} className="space-y-2 p-4 rounded-lg bg-[#1E1E1C]/60 border border-[#353532]">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-gray-200">{cat.category}</span>
                <span className="font-mono text-brand-400 font-bold">{cat.scorePercentage}%</span>
              </div>
              <ProgressBar value={cat.scorePercentage} color={cat.scorePercentage >= 70 ? 'success' : 'warning'} size="sm" />
              <div className="text-[11px] text-gray-400 pt-0.5">
                {cat.correct} of {cat.totalQuestions} questions correct
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* 3. Detailed Question Analysis with Detailed Solutions */}
      {result.questionAnalysis && result.questionAnalysis.length > 0 && (
        <Card variant="premium" className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#353532]/80 pb-3">
            <h3 className="text-base font-bold text-white">Question Review & Detailed Solutions</h3>
            <span className="text-xs text-gray-400">Click any row to reveal working & shortcuts</span>
          </div>

          <div className="space-y-3">
            {result.questionAnalysis.map((item) => {
              const isExpanded = expandedRow === item.questionNumber;
              return (
                <div
                  key={item.questionNumber}
                  className="rounded-lg bg-[#1E1E1C]/60 border border-[#353532] overflow-hidden transition-all duration-200"
                >
                  <div
                    onClick={() => toggleRow(item.questionNumber)}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-[#262624] transition-colors"
                  >
                    <div className="flex items-center space-x-3 min-w-0 flex-1 pr-4">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 ${
                          item.isCorrect ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                        }`}
                      >
                        {item.isCorrect ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      </span>
                      <span className="text-xs font-mono text-gray-400 shrink-0">Q{item.questionNumber}</span>
                      <p className="text-xs font-medium text-gray-200 truncate">{item.questionText}</p>
                    </div>

                    <div className="flex items-center space-x-3 shrink-0">
                      <span className="text-[11px] font-mono text-gray-400">
                        Your: <span className={item.isCorrect ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>{item.selectedAnswer || 'Skipped'}</span> | Correct: <span className="text-emerald-400 font-bold">{item.correctAnswer}</span>
                      </span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                  </div>

                  {/* Expanded Solution Drawer */}
                  {isExpanded && (
                    <div className="p-5 bg-[#141413] border-t border-[#353532] space-y-4 text-xs">
                      {item.concept && (
                        <div className="flex items-start space-x-2">
                          <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-amber-300">Core Concept: </span>
                            <span className="text-gray-300">{item.concept}</span>
                          </div>
                        </div>
                      )}

                      <div className="space-y-1">
                        <span className="font-bold text-gray-300">Explanation:</span>
                        <p className="text-gray-400 leading-relaxed">{item.explanation}</p>
                      </div>

                      {item.shortcut && (
                        <div className="p-3.5 rounded-xl bg-brand-950/30 border border-brand-500/30 flex items-start space-x-2">
                          <Zap className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-brand-300">Exam Shortcut: </span>
                            <span className="text-brand-200">{item.shortcut}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
        <Link to="/aptitude">
          <Button variant="secondary" size="md" leftIcon={<RotateCcw className="w-4 h-4" />}>
            Take Another Assessment
          </Button>
        </Link>
        <Link to="/dashboard">
          <Button variant="primary" size="md" leftIcon={<LayoutDashboard className="w-4 h-4" />}>
            Return to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
};

