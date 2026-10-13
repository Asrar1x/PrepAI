import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { aptitudeApi } from '../../api/aptitude';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { formatDuration } from '../../lib/formatters';
import {
  Clock,
  ChevronRight,
  Send,
  Code2,
  Sparkles
} from '../../components/icons';
import toast from 'react-hot-toast';
import { getFriendlyErrorMessage } from '../../api/client';

// Counts down from the server-provided remaining time and calls onExpire once at zero.
const CountdownTimer: React.FC<{ initialSeconds: number; onExpire: () => void }> = ({ initialSeconds, onExpire }) => {
  const [secondsRemaining, setSecondsRemaining] = useState(initialSeconds);
  const onExpireRef = useRef(onExpire);
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (secondsRemaining === 0) onExpireRef.current();
  }, [secondsRemaining]);

  const isUnder5Minutes = secondsRemaining < 300;
  return (
    <div
      className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all ${
        isUnder5Minutes
          ? 'bg-rose-500/20 border-rose-500 text-rose-300 animate-pulse'
          : 'bg-[#1E1E1C] border-[#353532] text-brand-300'
      }`}
    >
      <Clock className={`w-4 h-4 ${isUnder5Minutes ? 'text-rose-400' : 'text-brand-400'}`} />
      <span>{formatDuration(secondsRemaining)} Remaining</span>
    </div>
  );
};

export const AptitudeTest: React.FC = () => {
  const { sessionId = '' } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const { data: session, isLoading, isError, error } = useQuery({
    queryKey: ['aptitude-session', sessionId],
    queryFn: () => aptitudeApi.getSession(sessionId),
    enabled: !!sessionId,
    // The remaining time must come from the server each time the test is opened
    staleTime: 0,
    gcTime: 0,
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, 'A' | 'B' | 'C' | 'D'>>({});

  const submitMutation = useMutation({
    mutationFn: (finalAnswers: Record<string, string>) => aptitudeApi.submitAnswers(sessionId, finalAnswers),
    onSuccess: (result) => {
      toast.success('Test submitted');
      navigate(`/aptitude/${sessionId}/results`, { state: { result } });
    },
    onError: (err) => {
      toast.error(getFriendlyErrorMessage(err));
    },
  });

  // The timer fires outside React's render cycle, so it reads the latest answers through a ref
  const answersRef = useRef(answers);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);
  const submittedRef = useRef(false);

  const handleSubmit = () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    submitMutation.mutate(answersRef.current, {
      onError: () => {
        submittedRef.current = false;
      },
    });
  };

  const handleTimeUp = () => {
    toast('Time is up. Submitting your answers.');
    handleSubmit();
  };

  useEffect(() => {
    if (session?.status === 'completed') {
      navigate(`/aptitude/${sessionId}/results`, { replace: true });
    }
  }, [session, sessionId, navigate]);

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-sm text-rose-300">
        {getFriendlyErrorMessage(error)}
      </div>
    );
  }

  if (isLoading || !session) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="relative w-12 h-12 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-brand-500/20" />
            <div className="w-12 h-12 rounded-full border-4 border-brand-500 border-t-transparent animate-spin" />
            <Sparkles className="w-4 h-4 text-brand-400 absolute inset-0 m-auto animate-pulse" />
          </div>
          <p className="text-xs text-gray-400 font-medium">Loading placement assessment questions...</p>
        </div>
      </div>
    );
  }

  const questions = session.questions;
  const currentQ = questions[currentIndex];
  const isFinalQuestion = currentIndex === questions.length - 1;
  const selectedOption = answers[currentQ.id];
  const difficultyKey = String(currentQ.difficulty || '').toLowerCase();

  const handleSelectOption = (optionId: 'A' | 'B' | 'C' | 'D') => {
    setAnswers((prev) => ({ ...prev, [currentQ.id]: optionId }));
  };

  const handleNext = () => {
    if (selectedOption) {
      // Best-effort: the final submission also carries every answer
      aptitudeApi.recordAnswer(sessionId, currentQ.id, selectedOption).catch(() => undefined);
    }
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleSkip = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* 1. Top Fixed Navigation Bar */}
      <div className="sticky top-16 z-30 bg-[#141413]/90 p-4 rounded-lg border border-[#353532] flex flex-wrap items-center justify-between gap-4 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
        <div className="flex items-center space-x-3">
          <span className="text-sm font-bold text-gray-100">
            Question {currentIndex + 1} <span className="text-gray-500 font-normal">of {questions.length}</span>
          </span>
          <Badge variant="cyan" size="sm">
            {currentQ.category}
          </Badge>
          <Badge
            variant={difficultyKey === 'hard' ? 'danger' : difficultyKey === 'medium' ? 'warning' : 'success'}
            size="sm"
            dot
          >
            {currentQ.difficulty}
          </Badge>
        </div>

        {/* Timer Bar */}
        <CountdownTimer key={session.sessionId} initialSeconds={session.timeRemainingSeconds} onExpire={handleTimeUp} />
      </div>

      {/* Progress Bar */}
      <ProgressBar
        value={currentIndex + 1}
        max={questions.length}
        color="accent"
        size="sm"
      />

      {/* 2. Main Question Card */}
      <Card variant="premium" className="p-7 sm:p-9 space-y-6">
        {/* Question Header & Sub-category */}
        {currentQ.subCategory && (
          <div className="text-xs font-bold text-brand-400">
            Topic: {currentQ.subCategory}
          </div>
        )}

        {/* Question Statement */}
        <p className="text-base sm:text-xl text-[#F2F2EF] font-medium leading-relaxed whitespace-pre-line font-sans">
          {currentQ.questionText}
        </p>

        {/* Code Snippet (if technical / pseudo-code) */}
        {currentQ.codeSnippet && (
          <div className="rounded-lg bg-[#080812] border border-[#353532] p-4 sm:p-5 font-mono text-xs text-brand-200 overflow-x-auto">
            <div className="flex items-center space-x-1.5 text-gray-400 pb-2 mb-2 border-b border-[#353532]/80">
              <Code2 className="w-3.5 h-3.5 text-brand-400" />
              <span className="text-[11px] font-bold">Pseudo-Code Execution</span>
            </div>
            <pre className="font-mono text-sm leading-relaxed">{currentQ.codeSnippet}</pre>
          </div>
        )}

        {/* Options List */}
        <div className="space-y-3 pt-2">
          {currentQ.options.map((option) => {
            const isSelected = selectedOption === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => handleSelectOption(option.id)}
                className={`w-full flex items-center space-x-4 p-4 sm:p-4.5 rounded-lg border text-left transition-all duration-200 ${
                  isSelected
                    ? 'bg-brand-600/25 border-brand-500 text-white ring-1 ring-brand-500/50'
                    : 'bg-[#1E1E1C]/60 border-[#353532] text-gray-300 hover:border-brand-500/40 hover:bg-[#1E1E1C]'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold font-mono transition-all shrink-0 ${
                    isSelected
                      ? 'bg-brand-600 text-white'
                      : 'bg-[#1A1A19] text-gray-400 border border-[#353532]'
                  }`}
                >
                  {option.id}
                </div>
                <span className="text-sm font-medium leading-relaxed">{option.text}</span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* 3. Bottom Controls */}
      <div className="flex items-center justify-between p-4 bg-[#1A1A19] border border-[#353532] rounded-lg shadow-lg">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSkip}
          disabled={isFinalQuestion}
          className="text-gray-400 hover:text-white"
        >
          Skip Question
        </Button>

        <div className="flex items-center space-x-3">
          {!isFinalQuestion ? (
            <Button
              variant="primary"
              size="md"
              disabled={!selectedOption}
              onClick={handleNext}
              rightIcon={<ChevronRight className="w-4 h-4" />}
             
            >
              Save & Next Question
            </Button>
          ) : (
            <Button
              variant="primary"
              size="md"
              isLoading={submitMutation.isPending}
              onClick={handleSubmit}
              leftIcon={<Send className="w-4 h-4" />}
              className="bg-emerald-600 hover:bg-emerald-500 border-emerald-500/30"
            >
              Submit Assessment
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

