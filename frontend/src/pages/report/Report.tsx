import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { interviewApi, ReportProcessingError } from '../../api/interview';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { formatDuration, getGradeBadgeClass } from '../../lib/formatters';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import {
  Download,
  Share2,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  MessageSquare,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  RotateCcw,
  LayoutDashboard,
  Camera,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Target,
} from '../../components/icons';
import toast from 'react-hot-toast';
import { getFriendlyErrorMessage } from '../../api/client';

// Webcam frames captured during the interview are kept in this tab's sessionStorage
function readEvidenceSnapshots(sessionId: string): any[] {
  try {
    const saved = sessionStorage.getItem(`interview_evidence_${sessionId}`);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export const Report: React.FC = () => {
  const { sessionId = 'latest' } = useParams<{ sessionId: string }>();
  const [activeTab, setActiveTab] = useState<
    'overview' | 'visual_audit' | 'questions' | 'communication' | 'resources'
  >('overview');
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(1);

  // Live Captured Video Snapshots from Candidate Webcam
  const liveEvidenceSnapshots = React.useMemo(() => readEvidenceSnapshots(sessionId), [sessionId]);
  const [selectedEvidenceModal, setSelectedEvidenceModal] = useState<any | null>(null);


  const { data: report, isLoading, isError, error } = useQuery({
    queryKey: ['report', sessionId],
    queryFn: () => interviewApi.getReport(sessionId),
    // While the server is still generating the report, keep polling (loading state is shown)
    retry: (count, err) => err instanceof ReportProcessingError && count < 120,
    retryDelay: 3000,
  });

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3 max-w-sm">
          <p className="text-sm text-rose-300">{getFriendlyErrorMessage(error)}</p>
          <Link to="/interview" className="text-xs text-brand-400 hover:underline">Start a mock interview</Link>
        </div>
      </div>
    );
  }

  if (isLoading || !report) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-gray-400">Loading placement diagnostic report...</p>
        </div>
      </div>
    );
  }

  const dimensions = report.dimensions || [];
  const strengths = report.strengths || [];
  const improvements = report.improvements || [];
  const analysis = report.improvementAnalysis || null;
  const audit = report.visualAudit || null;
  const questionAnalysis = report.questionAnalysis || [];
  const communicationStats = report.communicationStats || {
    paceWordsPerMinute: null,
    fillerWordCount: 0,
    fillerWordsDetected: [],
    talkTimeRatioPercentage: 0,
    averageResponseTimeSeconds: 0,
  };
  const resources = report.resources || [];

  const radarData = dimensions.map((d) => ({
    dimension: d.name,
    score: d.score,
    fullMark: 100,
  }));

  const handleCopyShareLink = () => {
    if (!report.shareToken) {
      toast.error('This report cannot be shared yet.');
      return;
    }
    const url = `${window.location.origin}/report/shared/${report.shareToken}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    toast.success('Share link copied');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleDownloadPDF = async () => {
    toast.success('Generating diagnostic placement report PDF...');
    try {
      // Server-rendered PDF built from the stored evaluations
      await interviewApi.downloadReportPdf(report.sessionId || sessionId);
    } catch {
      window.print();
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* 1. Score Hero Summary */}
      <div className="p-8 sm:p-10 rounded-xl bg-[#1F1F1E] border border-gray-800 relative overflow-hidden">
        {/* Glow */}

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl font-semibold text-white tracking-tight">
              Interview report
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 max-w-xl leading-relaxed">
              Conducted with {report.persona} ({report.interviewType}). Each of the seven scores below comes from your recorded answers.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded text-xs font-semibold border ${getGradeBadgeClass(
                  report.grade
                )}`}
              >
                Grade {report.grade}
              </span>
              <Badge variant="accent">{report.jobRole}</Badge>
              {report.companyTarget && <Badge variant="neutral">{report.companyTarget}</Badge>}
            </div>
          </div>

          {/* Huge Score Hero Badge */}
          <div className="flex items-center space-x-6 card-premium p-6 shrink-0 relative overflow-hidden group shadow-lg">
            {/* Ambient Glow */}
            <div className="text-center relative z-10">
              <div className="text-[11px] font-semibold text-gray-400">
                Readiness Score
              </div>
              <div className="text-5xl sm:text-6xl font-semibold text-white mt-1 text-gradient">
                {report.overallScore}
                <span className="text-xl text-gray-500 font-sans">/100</span>
              </div>
            </div>
            <div className="h-12 w-px bg-gray-800" />
            <div className="space-y-1 text-xs">
              <div className="text-gray-400">
                Duration:{' '}
                <span className="text-gray-200 font-mono font-bold">
                  {formatDuration(report.durationSeconds)}
                </span>
              </div>
              <div className="text-gray-400">
                Answers evaluated:{' '}
                <span className="text-gray-200 font-mono font-bold">{questionAnalysis.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 pt-6 border-t border-gray-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDownloadPDF}
              leftIcon={<Download className="w-4 h-4" />}
            >
              Export PDF
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShareModalOpen(true)}
              leftIcon={<Share2 className="w-4 h-4 text-brand-400" />}
            >
              Share Report
            </Button>
          </div>

          <div className="flex items-center space-x-3">
            <Link to="/interview">
              <Button variant="primary" size="sm" leftIcon={<RotateCcw className="w-4 h-4" />}>
                Retake Mock Interview
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button variant="ghost" size="sm" leftIcon={<LayoutDashboard className="w-4 h-4" />}>
                Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-800 pb-2">
        {[
          { id: 'overview', label: 'Scores and strengths' },
          {
            id: 'visual_audit',
            label: 'Camera Feedback',
          },
          { id: 'questions', label: 'Question Breakdown' },
          { id: 'communication', label: 'Communication Metrics' },
          { id: 'resources', label: 'Curated Study Resources' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-300 relative overflow-hidden ${
              activeTab === tab.id
                ? 'bg-brand-600/20 text-brand-300 border border-brand-500/30'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent'
            }`}
          >
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[2px] bg-brand-400 rounded-t-full" />
            )}
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT */}

      {/* TAB 1: OVERVIEW & 7D RADAR */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Radar Chart & Dimension Progress Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* 7D Radar Visualizer */}
            <Card className="lg:col-span-6 p-6 card-premium flex flex-col items-center">
              <h3 className="text-sm font-bold text-gray-200 mb-2 self-start">
                7-Dimension Placement Rubric
              </h3>
              <div className="w-full h-80 relative">
                {/* Subtle radar glow behind chart */}
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                    <PolarGrid stroke="#30302E" strokeDasharray="3 3" />
                    <PolarAngleAxis dataKey="dimension" stroke="#9CA3AF" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#4B5563" tick={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1A1A19', borderColor: '#353532', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }}
                      itemStyle={{ color: '#6A93E6' }}
                      labelStyle={{ color: '#E5E7EB', fontWeight: 'bold' }}
                    />
                    <Radar
                      name="Score"
                      dataKey="score"
                      stroke="#6A93E6"
                      strokeWidth={2}
                      fill="url(#colorScore)"
                      fillOpacity={0.5}
                    />
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6A93E6" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#4A76D9" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Dimension Breakdown Sliders */}
            <Card className="lg:col-span-6 p-6 card-premium space-y-3.5">
              <h3 className="text-sm font-bold text-gray-200 mb-3">
                Scoring Weights & Benchmarks
              </h3>
              {dimensions.map((dim, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-gray-300">
                      {dim.name}{' '}
                      <span className="text-[11px] text-gray-500 font-mono">
                        ({dim.weightPercentage}%)
                      </span>
                    </span>
                    <span className="font-mono text-brand-400 font-bold">{dim.score}%</span>
                  </div>
                  <ProgressBar
                    value={dim.score}
                    color={dim.score >= 80 ? 'accent' : 'warning'}
                    size="sm"
                  />
                </div>
              ))}
            </Card>
          </div>

          {/* AI Performance Analysis: gap to target, fastest gains, what to learn, progress over time */}
          {analysis && (
            <Card className="p-6 card-premium space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-800 pb-3">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-brand-400" />
                  <h3 className="text-base font-bold text-white">AI Performance Analysis</h3>
                </div>
                <span className="text-[11px] text-gray-500 font-mono">
                  {analysis.narrativeSource === 'computed' ? 'Computed from your evaluated answers' : `Written by ${analysis.narrativeSource} from your evaluated answers`}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-[#1F1F1E] border border-gray-800">
                  <div className="text-[11px] text-gray-400 font-semibold flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5" /> Gap to {analysis.targetLabel}
                  </div>
                  <div className="text-2xl font-semibold text-white font-mono mt-1">
                    {analysis.readyNow ? 'Ready' : `+${analysis.gap} pts`}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-1">
                    {analysis.currentScore}/100 now · target {analysis.targetScore}/100
                  </div>
                  <div className="mt-2">
                    <ProgressBar value={Math.min(100, Math.round((analysis.currentScore / analysis.targetScore) * 100))} color={analysis.readyNow ? 'accent' : 'warning'} size="sm" />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#1F1F1E] border border-gray-800">
                  <div className="text-[11px] text-gray-400 font-semibold flex items-center gap-1.5">
                    {(analysis.history.change ?? 0) < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />} Progress vs. last interview
                  </div>
                  <div className="text-2xl font-semibold text-white font-mono mt-1">
                    {analysis.history.change === null ? 'N/A' : `${analysis.history.change > 0 ? '+' : ''}${analysis.history.change} pts`}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-1">
                    {analysis.history.interviewsBefore === 0
                      ? 'First interview remembered. Your next report will show progress.'
                      : `Previous ${analysis.history.previousScore}/100 · average of ${analysis.history.interviewsBefore} earlier: ${analysis.history.previousAverage}/100`}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#1F1F1E] border border-gray-800">
                  <div className="text-[11px] text-gray-400 font-semibold flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5" /> Fastest path to target
                  </div>
                  <div className="text-xs text-gray-200 mt-2 leading-relaxed">
                    {analysis.readyNow
                      ? 'You are above the target. Keep improving your weakest dimensions.'
                      : analysis.fastestPath.length
                        ? `Focus on ${analysis.fastestPath.join(', ')}.`
                        : 'Improve every dimension evenly.'}
                  </div>
                </div>
              </div>

              {analysis.narrative.length > 0 && (
                <div className="space-y-3">
                  {analysis.narrative.map((para, idx) => (
                    <p key={idx} className="text-sm text-gray-300 leading-relaxed">{para}</p>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-gray-200">How much to improve (to {analysis.targetScore})</h4>
                  {analysis.dimensionGaps.length === 0 && (
                    <p className="text-xs text-gray-400">Every dimension is at or above the target.</p>
                  )}
                  {analysis.dimensionGaps.map((d) => (
                    <div key={d.key} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-gray-300">
                          {d.name} <span className="text-[11px] text-gray-500 font-mono">({d.weightPercentage}%)</span>
                        </span>
                        <span className="font-mono text-amber-300">
                          {d.score} → {d.target} <span className="text-emerald-400">(+{d.pointsGain} overall)</span>
                        </span>
                      </div>
                      <ProgressBar value={d.score} color="warning" size="sm" />
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-gray-200">What to learn next</h4>
                  {analysis.conceptsToLearn.length === 0 && analysis.topicsToImprove.length === 0 && (
                    <p className="text-xs text-gray-400">No missing concepts were found in this interview.</p>
                  )}
                  {analysis.topicsToImprove.map((t) => (
                    <div key={t.topic} className="p-3 rounded-xl bg-[#1F1F1E] border border-gray-800 space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-amber-300">{t.topic}</span>
                        <span className="font-mono text-gray-300">
                          {t.score}% → {t.target}%{t.earlierAverage !== null ? ` · earlier avg ${t.earlierAverage}%` : ''}
                        </span>
                      </div>
                      {t.missingConcepts.length > 0 && (
                        <div className="text-[11px] text-gray-400">Learn: {t.missingConcepts.join(', ')}</div>
                      )}
                    </div>
                  ))}
                  {analysis.conceptsToLearn.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {analysis.conceptsToLearn.map((c) => (
                        <span
                          key={c.concept}
                          className={`text-[11px] px-2.5 py-1 rounded-lg border ${c.missedBefore ? 'bg-rose-500/10 border-rose-500/30 text-rose-200' : 'bg-brand-500/10 border-brand-500/30 text-brand-200'}`}
                          title={c.missedBefore ? 'Also missed in an earlier interview' : `Missed in: ${c.topics.join(', ')}`}
                        >
                          {c.concept}{c.missedBefore ? ' · again' : ''}
                        </span>
                      ))}
                    </div>
                  )}
                  {analysis.recurringWeaknesses.length > 0 && (
                    <div className="p-2 rounded-lg bg-rose-500/10 text-rose-200 text-[11px] border border-rose-500/20">
                      Repeatedly missed across your interviews: {analysis.recurringWeaknesses.map(r => `${r.concept} (${r.times}×)`).join(', ')}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Strengths and Weaknesses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Strengths */}
            <Card className="p-6 card-premium space-y-4">
              <div className="flex items-center space-x-2 border-b border-gray-800 pb-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Demonstrated Strengths</h3>
              </div>
              <div className="space-y-3">
                {strengths.map((str) => (
                  <div
                    key={str.id}
                    className="p-4 rounded-xl bg-[#1F1F1E] border border-gray-800 space-y-1.5"
                  >
                    <h4 className="text-xs font-bold text-emerald-300">{str.title}</h4>
                    <p className="text-xs text-gray-300 leading-relaxed">{str.evidence}</p>
                    <div className="text-[11px] text-gray-400 font-medium">
                      Impact: {str.impact}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Areas to Improve */}
            <Card className="p-6 card-premium space-y-4">
              <div className="flex items-center space-x-2 border-b border-gray-800 pb-3">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Targeted Action Items</h3>
              </div>
              <div className="space-y-3">
                {improvements.map((imp) => (
                  <div
                    key={imp.id}
                    className="p-4 rounded-xl bg-[#1F1F1E] border border-gray-800 space-y-1.5"
                  >
                    <h4 className="text-xs font-bold text-amber-300">{imp.title}</h4>
                    <p className="text-xs text-gray-300 leading-relaxed">{imp.whyItMatters}</p>
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-200 text-[11px] border border-amber-500/20">
                      Action: {imp.specificNextAction}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB: CAMERA SNAPSHOTS (self-review only, not scored) */}
      {activeTab === 'visual_audit' && (
        <Card className="p-6 card-premium space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <Camera className="w-5 h-5 text-brand-400" />
                <h3 className="text-lg font-semibold text-white">Camera Feedback</h3>
              </div>
              <p className="text-xs text-gray-400 mt-1 max-w-2xl">
                After the interview, a local vision model looks at each webcam frame and notes what an
                interviewer would see: where you looked, how you sat, framing, lighting, clothing and
                anything distracting. It describes what is visible only, never your feelings or personality.
                The images are deleted after analysis.
              </p>
            </div>
            {audit && !audit.unavailable && (
              <Badge variant="neutral">{audit.framesAnalysed} frame(s) analysed</Badge>
            )}
          </div>

          {audit && audit.unavailable && (
            <p className="text-xs text-amber-300">
              {audit.framesCaptured} frame(s) were captured but the vision model could not analyse them. Check that
              the vision model is installed, then retry the report.
            </p>
          )}

          {audit && !audit.unavailable && (
            <div className="space-y-6">
              {audit.summary && <p className="text-sm text-gray-300 leading-relaxed">{audit.summary}</p>}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-gray-200">How you came across on camera</h4>
                  {audit.attributes.map((a) => (
                    <div key={a.key} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-gray-300">{a.label}</span>
                        <span className="font-mono text-gray-300">{a.good} of {a.frames} frames</span>
                      </div>
                      <ProgressBar value={a.percent} color={a.percent >= 80 ? 'accent' : 'warning'} size="sm" />
                    </div>
                  ))}
                  <div className="p-3 rounded-lg bg-[#1F1F1E] border border-gray-800 space-y-1">
                    <div className="text-xs font-bold text-gray-200">Dress code</div>
                    <p className="text-xs text-gray-300">{audit.attire.verdict}</p>
                    {audit.attire.notes.length > 0 && (
                      <p className="text-[11px] text-gray-400">Seen: {audit.attire.notes.join('; ')}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-gray-200">What to fix before your next interview</h4>
                  {audit.fixes.length === 0 ? (
                    <p className="text-xs text-gray-400">Nothing to fix: no posture, eye-line, framing or distraction issues were seen.</p>
                  ) : (
                    audit.fixes.map((f, i) => (
                      <div key={i} className="p-3 rounded-lg bg-[#1F1F1E] border border-gray-800 space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-amber-300">{f.issue}</span>
                          <span className="font-mono text-gray-400">{f.frames} of {f.of} frames</span>
                        </div>
                        <p className="text-xs text-gray-300">{f.fix}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {audit.timeline.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-200">Moment by moment</h4>
                  <ul className="space-y-1.5">
                    {audit.timeline.map((t, i) => (
                      <li key={i} className="flex gap-3 text-xs">
                        <span className="font-mono text-brand-300 shrink-0">{t.at}</span>
                        <span className="text-gray-300">{t.notes.join(', ')}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {liveEvidenceSnapshots.length === 0 ? (
            !audit &&
            <p className="text-xs text-gray-500">
              No camera frames were captured for this session (the camera was off or the report was opened in a different browser tab).
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {liveEvidenceSnapshots.map((item, idx) => (
                <button
                  key={item.id || idx}
                  type="button"
                  onClick={() => setSelectedEvidenceModal(item)}
                  className="rounded-xl overflow-hidden border border-gray-800 hover:border-brand-500/60 transition-colors text-left"
                >
                  <img src={item.dataUrl} alt={`Interview snapshot at ${item.timestamp}`} className="w-full aspect-video object-cover" />
                  <div className="px-3 py-2 text-[11px] text-gray-400 font-mono bg-[#1F1F1E]">Captured at {item.timestamp}</div>
                </button>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* TAB 2: QUESTION ANALYSIS */}
      {activeTab === 'questions' && (
        <Card className="p-6 card-premium space-y-4">
          <div className="border-b border-gray-800 pb-3">
            <h3 className="text-base font-bold text-white">Turn-by-Turn Question Evaluation</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Click any question to view technical critique, STAR evaluation, and candidate summary.
            </p>
          </div>

          <div className="space-y-3">
            {questionAnalysis.map((item) => {
              const isExpanded = expandedQuestion === item.questionNumber;
              return (
                <div
                  key={item.questionNumber}
                  className="rounded-lg bg-[#1F1F1E] border border-gray-800 overflow-hidden"
                >
                  <div
                    onClick={() => setExpandedQuestion(isExpanded ? null : item.questionNumber)}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-[#232334] transition-colors"
                  >
                    <div className="flex items-center space-x-3 min-w-0 flex-1 pr-4">
                      <span className="w-8 h-8 rounded-lg bg-brand-600/20 text-brand-400 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                        Q{item.questionNumber}
                      </span>
                      <p className="text-xs font-bold text-gray-200 truncate">{item.question}</p>
                    </div>

                    <div className="flex items-center space-x-3 shrink-0">
                      <Badge variant="neutral" size="sm">
                        {item.topic}
                      </Badge>
                      <span className="text-xs font-bold font-mono text-brand-400">
                        {item.score}%
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-5 bg-[#14141F] border-t border-gray-800 space-y-4 text-xs">
                      {/* 1. Evidence Quote from candidate */}
                      {item.evidenceQuote && (
                        <div className="p-3.5 rounded-xl bg-[#161615] border border-brand-500/30 space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-400">
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Candidate Response Evidence (Direct Transcript Extract)</span>
                          </div>
                          <p className="text-xs text-gray-200 italic border-l-2 border-brand-500 pl-3 py-0.5 leading-relaxed">
                            &ldquo;{item.evidenceQuote}&rdquo;
                          </p>
                        </div>
                      )}

                      {/* 2. 5-Dimension Rubric Breakdown */}
                      {item.dimensionScores && (
                        <div className="space-y-1.5">
                          <span className="font-semibold text-gray-400">Rubric Dimension Scores:</span>
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                            <div className="p-2 rounded-lg bg-[#161615] border border-gray-800 text-center">
                              <div className="text-[11px] text-gray-400">Correctness (25%)</div>
                              <div className="text-sm font-bold text-emerald-400 font-mono mt-0.5">{item.dimensionScores.correctness}%</div>
                            </div>
                            <div className="p-2 rounded-lg bg-[#161615] border border-gray-800 text-center">
                              <div className="text-[11px] text-gray-400">Relevance (15%)</div>
                              <div className="text-sm font-bold text-brand-400 font-mono mt-0.5">{item.dimensionScores.relevance}%</div>
                            </div>
                            <div className="p-2 rounded-lg bg-[#161615] border border-gray-800 text-center">
                              <div className="text-[11px] text-gray-400">Tech Depth (15%)</div>
                              <div className="text-sm font-bold text-brand-400 font-mono mt-0.5">{item.dimensionScores.technicalDepth}%</div>
                            </div>
                            <div className="p-2 rounded-lg bg-[#161615] border border-gray-800 text-center">
                              <div className="text-[11px] text-gray-400">Clarity (10%)</div>
                              <div className="text-sm font-bold text-brand-400 font-mono mt-0.5">{item.dimensionScores.clarity}%</div>
                            </div>
                            <div className="p-2 rounded-lg bg-[#161615] border border-gray-800 text-center">
                              <div className="text-[11px] text-gray-400">Completeness (15%)</div>
                              <div className="text-sm font-bold text-amber-400 font-mono mt-0.5">{item.dimensionScores.completeness}%</div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 3. Strengths & Missing Concepts */}
                      {item.missingConcepts && item.missingConcepts.length > 0 && (
                        <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-1.5">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Missing Concepts & Technical Gaps</span>
                          </div>
                          <ul className="list-disc list-inside text-xs text-amber-200/90 space-y-0.5 pl-1">
                            {item.missingConcepts.map((concept, cIdx) => (
                              <li key={cIdx}>{concept}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* 4. Example of a strong answer */}
                      {item.betterSampleAnswer && (
                        <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
                          <div className="flex items-center justify-between text-xs font-semibold text-emerald-400">
                            <div className="flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Example of a strong answer</span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(item.betterSampleAnswer || '');
                                toast.success('Example answer copied');
                              }}
                              className="hover:text-emerald-300 p-1 flex items-center gap-1 text-[11px]"
                              title="Copy Sample Answer"
                            >
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </button>
                          </div>
                          <p className="text-xs text-gray-200 leading-relaxed font-sans">
                            {item.betterSampleAnswer}
                          </p>
                        </div>
                      )}

                      {/* 5. Actionable Improvement Task */}
                      {item.actionableTask && (
                        <div className="p-3 rounded-xl bg-brand-950/30 border border-brand-500/30 flex items-start gap-2.5 text-xs">
                          <Lightbulb className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold text-brand-300">Actionable Mastery Task: </span>
                            <span className="text-gray-300 leading-relaxed">{item.actionableTask}</span>
                          </div>
                        </div>
                      )}

                      {/* 6. Assessment Notes & Status */}
                      <div className="pt-2 border-t border-gray-800 flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-400">Answer Verdict:</span>
                          <span className={`font-semibold ${
                            item.score >= 80 ? 'text-emerald-400' : item.score >= 50 ? 'text-amber-400' : 'text-rose-400'
                          }`}>
                            {item.answerQuality || (item.score >= 80 ? 'Exceptional' : item.score >= 50 ? 'Moderate' : 'Needs Revision')}
                          </span>
                        </div>
                        {item.difficulty && (
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-400">Difficulty Tier:</span>
                            <span className="text-brand-400 font-mono font-medium">{item.difficulty}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* TAB 3: COMMUNICATION STATS */}
      {activeTab === 'communication' && (
        <Card className="p-6 card-premium space-y-6">
          <div className="border-b border-gray-800 pb-3">
            <h3 className="text-base font-bold text-white">Speaking and delivery</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Audio pacing, filler words, talk-to-listen ratios, and verbal clarity breakdown.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-[#1F1F1E] border border-gray-800">
              <div className="text-[11px] text-gray-400 font-semibold">Speaking Pace</div>
              <div className="text-2xl font-semibold text-white font-mono mt-1">
                {communicationStats.paceWordsPerMinute ?? 'N/A'} <span className="text-xs font-normal text-gray-400">WPM</span>
              </div>
              <div className="text-[11px] text-emerald-400 mt-1">Optimal Range (130-160 WPM)</div>
            </div>

            <div className="p-4 rounded-xl bg-[#1F1F1E] border border-gray-800">
              <div className="text-[11px] text-gray-400 font-semibold">Filler Words</div>
              <div className="text-2xl font-semibold text-white font-mono mt-1">
                {communicationStats.fillerWordCount ?? 0}
              </div>
              <div className="text-[11px] text-amber-400 mt-1">
                {communicationStats.fillerWordsDetected?.join(', ') || 'None detected'}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#1F1F1E] border border-gray-800">
              <div className="text-[11px] text-gray-400 font-semibold">Candidate Talk Ratio</div>
              <div className="text-2xl font-semibold text-brand-400 font-mono mt-1">
                {communicationStats.talkTimeRatioPercentage ?? 0}%
              </div>
              <div className="text-[11px] text-gray-400 mt-1">Balanced (Interviewer: 38%)</div>
            </div>

            <div className="p-4 rounded-xl bg-[#1F1F1E] border border-gray-800">
              <div className="text-[11px] text-gray-400 font-semibold">Avg Response Latency</div>
              <div className="text-2xl font-semibold text-white font-mono mt-1">
                {communicationStats.averageResponseTimeSeconds ?? 0}s
              </div>
              <div className="text-[11px] text-emerald-400 mt-1">Quick Thinking (Ideal &lt; 3.0s)</div>
            </div>
          </div>
        </Card>
      )}

      {/* TAB 4: RESOURCES */}
      {activeTab === 'resources' && (
        <Card className="p-6 card-premium space-y-4">
          <div className="border-b border-gray-800 pb-3">
            <h3 className="text-base font-bold text-white">Curated Placement Preparation Resources</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Personalized recommendations based on identified weak points and technical gaps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {resources.map((res, idx) => (
              <div
                key={idx}
                className="p-5 rounded-lg bg-[#1F1F1E] border border-gray-800 space-y-2 hover:border-gray-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <Badge variant="accent" size="sm">
                    {res.type}
                  </Badge>
                  <a
                    href={res.externalLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 font-semibold"
                  >
                    Open Resource <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
                <h4 className="text-sm font-bold text-gray-100">{res.title}</h4>
                <p className="text-xs text-gray-400 leading-relaxed">{res.description}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Evidence Snapshot Zoom Inspection Modal */}
      {selectedEvidenceModal && (
        <Modal
          isOpen={!!selectedEvidenceModal}
          onClose={() => setSelectedEvidenceModal(null)}
          title={`Camera frame at ${selectedEvidenceModal.timestamp}`}
          description="Webcam frame captured during your interview, for self-review only (not scored)."
        >
          <div className="space-y-4 pt-2">
            <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-gray-800">
              <img
                src={selectedEvidenceModal.dataUrl}
                alt="Enlarged Evidence Frame"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Share Modal Dialog */}
      <Modal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        title="Share Interview report"
        description="Anyone with this link can view a read-only version of your score summary and radar chart."
      >
        <div className="space-y-4 pt-2">
          <div className="p-3 bg-[#171716] rounded-xl border border-gray-800 flex items-center justify-between text-xs font-mono text-gray-300 truncate">
            <span className="truncate">
              {report.shareToken ? `${window.location.origin}/report/shared/${report.shareToken}` : 'Not available'}
            </span>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCopyShareLink}
              leftIcon={
                copiedLink ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )
              }
              className="shrink-0 ml-2"
            >
              {copiedLink ? 'Copied' : 'Copy Link'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
