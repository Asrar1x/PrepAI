// Adaptive aptitude test runner — wires the real /aptitude/* endpoints.
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui';
import { Skeleton } from '@/shared/components/Skeleton';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import { CheckCircle2, XCircle, Clock, AlertCircle, PlayCircle, Trophy, BarChart, Lightbulb, Square } from 'lucide-react';
import {
  useAptitudeReport,
  useEndAptitude,
  useNextQuestion,
  useStartAptitude,
  useSubmitAnswer,
} from './queries';
import type { AptitudeQuestion, AptitudeReport, AptitudeSubmitResponse } from './api';

interface Props {
  roleSlug: string;
  companySlug?: string;
}

export function AptitudeTestRunner({ roleSlug, companySlug }: Props) {
  const navigate = useNavigate();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [question, setQuestion] = useState<AptitudeQuestion | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<AptitudeSubmitResponse | null>(null);
  const [questionStart, setQuestionStart] = useState<number>(Date.now());
  const [finalReport, setFinalReport] = useState<AptitudeReport | null>(null);
  const start = useStartAptitude();
  const next = useNextQuestion();
  const submit = useSubmitAnswer();
  const end = useEndAptitude();
  const reportQ = useAptitudeReport(sessionId ?? '');
  const questionCounter = useRef(0);

  async function startSession() {
    const r = await start.mutateAsync({
      role_slug: roleSlug,
      company_slug: companySlug ?? null,
      mode: 'adaptive',
      duration_minutes: 15,
    });
    setSessionId(r.id);
    await fetchNext(r.id);
  }

  async function fetchNext(sid: string) {
    const q = await next.mutateAsync(sid);
    setQuestion(q);
    setSelected(null);
    setResult(null);
    setQuestionStart(Date.now());
    questionCounter.current += 1;
  }

  async function handleSubmit() {
    if (!sessionId || !question || selected == null) return;
    const seconds = Math.max(1, Math.round((Date.now() - questionStart) / 1000));
    const r = await submit.mutateAsync({
      sessionId,
      payload: {
        question_id: question.id,
        selected_index: selected,
        time_taken_seconds: seconds,
      },
    });
    setResult(r);
  }

  async function handleEnd() {
    if (!sessionId) return;
    const r = await end.mutateAsync(sessionId);
    setFinalReport(r);
  }

  if (finalReport) {
    return (
      <ErrorBoundary>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" /> Session complete
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-700">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="Score" value={`${finalReport.score}%`} />
              <Stat label="Correct" value={String(finalReport.correct_count)} />
              <Stat label="Wrong" value={String(finalReport.wrong_count)} />
              <Stat label="Max difficulty" value={finalReport.max_difficulty_reached ?? 'easy'} />
            </div>
            <div>
              <h4 className="font-medium text-slate-800 mt-4 mb-1">Category breakdown</h4>
              <div className="space-y-1">
                {Object.entries(finalReport.category_scores ?? {}).map(([cat, s]) => (
                  <div key={cat} className="flex items-center gap-2">
                    <span className="w-32 text-xs text-slate-500 capitalize">{cat}</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded">
                      <div
                        className="h-2 rounded bg-indigo-500"
                        style={{ width: `${s.weighted_pct}%` }}
                      />
                    </div>
                    <span className="w-14 text-right text-xs text-slate-500">{s.weighted_pct}%</span>
                  </div>
                ))}
              </div>
            </div>
            {finalReport.weak_topics?.length > 0 && (
              <div className="rounded border border-rose-200 bg-rose-50 p-3 text-rose-700 text-xs">
                <strong>Weak topics (&lt; 60%):</strong>{' '}
                {finalReport.weak_topics.map((w) => `${w.category} (${w.weighted_pct}%)`).join(', ')}
              </div>
            )}
            <div className="pt-3 flex gap-2">
              <button
                onClick={() => {
                  setSessionId(null);
                  setQuestion(null);
                  setFinalReport(null);
                  questionCounter.current = 0;
                }}
                className="px-3 py-1.5 rounded-md bg-indigo-600 text-white text-sm hover:bg-indigo-700"
              >
                New session
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="px-3 py-1.5 rounded-md border border-slate-200 text-sm hover:bg-slate-50"
              >
                Back to dashboard
              </button>
            </div>
          </CardContent>
        </Card>
      </ErrorBoundary>
    );
  }

  if (!sessionId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlayCircle className="w-5 h-5 text-indigo-500" /> Adaptive Aptitude Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-700">
          <p>
            You will see one question at a time. Difficulty adapts to your answers in each
            category (quantitative, logical, verbal, coding, data interpretation, CS core).
          </p>
          <ul className="list-disc list-inside text-xs text-slate-500 space-y-0.5">
            <li>3 correct in a row → harder question</li>
            <li>2 wrong in a row → easier question</li>
            <li>Solutions are revealed after each answer</li>
          </ul>
          <button
            disabled={start.isPending}
            onClick={startSession}
            className="px-3 py-1.5 rounded-md bg-indigo-600 text-white text-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            {start.isPending ? 'Starting…' : 'Start session'}
          </button>
          {start.isError && (
            <div className="text-rose-700 text-xs">{(start.error as Error).message}</div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (!question) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-32" />
        <Skeleton className="h-12" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-baseline">
            <CardTitle>
              Q{questionCounter.current} <span className="text-slate-400">/ adaptive</span>
            </CardTitle>
            <div className="flex gap-2 text-xs">
              <Badge>{question.category}</Badge>
              <Badge variant="solid">{question.difficulty}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-base text-slate-800">{question.question}</p>
          <div className="space-y-2">
            {question.options.map((opt, idx) => {
              const isSelected = selected === idx;
              const isCorrect = result && idx === result.correct_index;
              const isWrong = result && isSelected && !result.is_correct;
              const cls = isCorrect
                ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                : isWrong
                  ? 'border-rose-500 bg-rose-50 text-rose-800'
                  : isSelected
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-slate-200 hover:border-slate-300';
              return (
                <button
                  key={idx}
                  onClick={() => !result && setSelected(idx)}
                  disabled={Boolean(result)}
                  className={`w-full text-left rounded-md border px-3 py-2 text-sm transition ${cls}`}
                >
                  {opt}
                </button>
              );
            })}
          </div>

          {result && (
            <div
              className={`rounded-md p-3 text-sm ${
                result.is_correct ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
              }`}
            >
              <div className="flex items-center gap-2 font-medium">
                {result.is_correct ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                {result.is_correct ? 'Correct' : 'Incorrect'}
              </div>
              {result.explanation && (
                <div className="mt-1 text-xs flex gap-1">
                  <Lightbulb className="w-3 h-3 mt-0.5" />
                  <span>{result.explanation}</span>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-between pt-2">
            <button
              onClick={handleEnd}
              className="text-xs text-slate-500 hover:underline inline-flex items-center gap-1"
            >
              <Square className="w-3 h-3" /> End session
            </button>
            <div className="flex gap-2">
              {!result ? (
                <button
                  disabled={selected == null || submit.isPending}
                  onClick={handleSubmit}
                  className="px-3 py-1.5 rounded-md bg-indigo-600 text-white text-sm hover:bg-indigo-700 disabled:opacity-50 inline-flex items-center gap-1"
                >
                  <Clock className="w-4 h-4" />
                  {submit.isPending ? 'Submitting…' : 'Submit'}
                </button>
              ) : (
                <button
                  onClick={() => sessionId && fetchNext(sessionId)}
                  disabled={next.isPending}
                  className="px-3 py-1.5 rounded-md bg-indigo-600 text-white text-sm hover:bg-indigo-700 disabled:opacity-50"
                >
                  {next.isPending ? 'Loading…' : 'Next question'}
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </ErrorBoundary>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-slate-200 bg-white p-3 text-center">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-lg font-semibold text-slate-800">{value}</div>
    </div>
  );
}
