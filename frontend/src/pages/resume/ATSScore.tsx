import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ATSScoreResult } from '../../types/resume';
import { useAuthStore } from '../../store/authStore';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ProgressBar } from '../../components/ui/ProgressBar';
import {
  Mic,
  FileText,
} from '../../components/icons';

import { resumeApi, normalizeATSScoreResult } from '../../api/resume';

export const ATSScore: React.FC = () => {
  const location = useLocation();
  const { user } = useAuthStore();
  const stateResult = location.state?.result as ATSScoreResult | undefined;
  const [fetchedResult, setFetchedResult] = React.useState<ATSScoreResult | null>(null);
  const [loadState, setLoadState] = React.useState<'loading' | 'done' | 'error'>(stateResult ? 'done' : 'loading');

  React.useEffect(() => {
    if (!stateResult) {
      resumeApi.getLatestResume()
        .then((saved) => {
          setFetchedResult(saved);
          setLoadState('done');
        })
        .catch(() => setLoadState('error'));
    }
  }, [stateResult]);

  const raw = stateResult || fetchedResult;
  const result: ATSScoreResult = normalizeATSScoreResult(raw, `${user?.name ? user.name.replace(/\s+/g, '_') : 'Candidate'}_Resume`);

  if (!raw) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center space-y-3">
        {loadState === 'loading' ? (
          <p className="text-xs text-gray-400">Loading your latest resume analysis…</p>
        ) : (
          <>
            <h1 className="text-xl font-bold text-white">
              {loadState === 'error' ? 'Could not load your resume analysis' : 'No resume uploaded yet'}
            </h1>
            <p className="text-xs text-gray-400">Upload a PDF resume to get your ATS score and interview hot-spots.</p>
            <Link to="/resume" className="text-xs text-brand-400 hover:underline">Upload resume</Link>
          </>
        )}
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
              Resume check
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 max-w-xl leading-relaxed">
              How a keyword-based applicant tracking system would read your resume, and which skills it would not find.
            </p>
            <Badge variant={result.overallScore >= 80 ? 'success' : 'warning'} size="sm" dot className="mt-1">
              {result.formatCheck}
            </Badge>
          </div>

          <div className="flex items-center space-x-6 bg-[#141413]/90 p-5 rounded-lg border border-[#353532] shrink-0">
            <div>
              <div className="text-xs text-gray-400 font-bold">Overall ATS Score</div>
              <div className="text-4xl font-semibold text-brand-400 font-mono mt-0.5">
                {result.overallScore} <span className="text-base text-gray-500 font-normal">/ 100</span>
              </div>
            </div>
            <div className="h-10 w-px bg-[#353532]" />
            <div>
              <div className="text-xs text-gray-400 font-bold">Density Check</div>
              <div className="text-base font-semibold text-emerald-400 font-mono mt-1">
                {result.wordCount} Words (Optimal)
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="relative z-10 mt-6 pt-6 border-t border-[#353532]/80 flex flex-wrap items-center gap-3">
          <Link to="/interview?type=resume">
            <Button variant="primary" size="sm" leftIcon={<Mic className="w-4 h-4" />}>
              Start Resume-Based Mock Interview
            </Button>
          </Link>
          <Link to="/resume/bullets">
            <Button variant="secondary" size="sm" leftIcon={<FileText className="w-4 h-4" />}>
              Action-Verb Bullet Generator
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. 6-Dimension ATS Breakdown */}
      <Card variant="premium" className="p-6 space-y-4">
        <h3 className="text-base font-bold text-white border-b border-[#353532]/80 pb-3">
          ATS Screening Dimension Scores
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(result.dimensions || []).map((dim) => (
            <div key={dim.id} className="p-4.5 rounded-lg bg-[#1E1E1C]/60 border border-[#353532] hover:border-brand-500/40 transition-all space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-gray-200">{dim.name}</span>
                <span className="font-mono text-brand-400 font-bold">{dim.score}%</span>
              </div>
              <ProgressBar value={dim.score} color={dim.score >= 80 ? 'success' : 'warning'} size="sm" />
              <p className="text-[11px] text-gray-400 leading-relaxed pt-1">{dim.explanation}</p>
              {Array.isArray(dim.recommendations) && dim.recommendations.length > 0 && (
                <div className="text-[11px] text-amber-300 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 font-medium">
                  Tip: {dim.recommendations[0]}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* 3. Resume Hotspots & Potential Interview Questions */}
      <Card variant="premium" className="p-6 space-y-4">
        <div className="border-b border-[#353532]/80 pb-3">
          <h3 className="text-base font-bold text-white">Detected Interview Hotspots</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            These resume sections will likely trigger in-depth technical counter-questions during live interviews.
          </p>
        </div>

        <div className="space-y-4">
          {(result.hotspots || []).map((hs) => (
            <div key={hs.id} className="p-4.5 rounded-lg bg-[#1E1E1C]/60 border border-[#353532] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-brand-300">{hs.title}</span>
                <Badge variant="accent" size="sm">{hs.category}</Badge>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">{hs.detail}</p>
              <div className="bg-[#141413] p-3.5 rounded-xl border border-[#353532] space-y-1.5">
                <span className="text-[11px] text-gray-400 font-bold">Expected Interview Questions:</span>
                {(hs.potentialQuestions || []).map((q, idx) => (
                  <div key={idx} className="text-xs text-brand-200 flex items-start gap-2 pt-0.5">
                    <span className="text-brand-400 font-bold">•</span>
                    <span>{q}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Keywords Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card variant="premium" className="p-5 space-y-3">
          <h4 className="text-xs font-bold text-emerald-400">Detected Keywords</h4>
          <div className="flex flex-wrap gap-2">
            {(result.detectedKeywords || []).map((kw, idx) => (
              <span key={idx} className="text-xs bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 px-2.5 py-1 rounded-lg font-medium">
                {kw}
              </span>
            ))}
          </div>
        </Card>

        <Card variant="premium" className="p-5 space-y-3">
          <h4 className="text-xs font-bold text-amber-400">Recommended Missing Keywords</h4>
          <div className="flex flex-wrap gap-2">
            {(result.missingKeywords || []).map((kw, idx) => (
              <span key={idx} className="text-xs bg-amber-500/10 text-amber-300 border border-amber-500/25 px-2.5 py-1 rounded-lg font-medium">
                + {kw}
              </span>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

