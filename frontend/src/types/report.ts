export type GradeType = 'A+' | 'A' | 'B' | 'C' | 'D';

export interface DimensionScore {
  name: string;
  score: number; // 0-100
  weightPercentage: number;
  description: string;
}

export interface FeedbackStrength {
  id: string;
  title: string;
  evidence: string;
  impact: string;
}

export interface FeedbackImprovement {
  id: string;
  title: string;
  whyItMatters: string;
  specificNextAction: string;
}

export interface QuestionFeedbackItem {
  questionNumber: number;
  question: string;
  topic: string;
  difficulty?: string;
  answerQuality: 'Exceptional' | 'Good' | 'Needs Improvement' | 'Inadequate' | 'Strong' | 'Moderate' | 'Needs Revision';
  score: number; // 0-100
  notes: string;
  candidateSummary?: string;
  starCompliance?: boolean;
  evidenceQuote?: string;
  dimensionScores?: {
    correctness: number;
    relevance: number;
    technicalDepth: number;
    clarity: number;
    completeness: number;
  };
  strengths?: string[];
  missingConcepts?: string[];
  betterSampleAnswer?: string;
  actionableTask?: string;
}

export interface CommunicationMetrics {
  fillerWordCount: number;
  fillerWordsDetected: string[];
  averageResponseTimeSeconds: number;
  longestAnswerSeconds: number;
  totalWordCount: number;
  talkTimeRatioPercentage: number; // Student vs AI talk ratio
  paceWordsPerMinute: number | null;
}

export interface WeakTopicItem {
  topic: string;
  reason: string;
  recommendedAction: string;
  priority: 'High' | 'Medium' | 'Low';
}

export interface CuratedResource {
  title: string;
  type: 'Video' | 'Article' | 'Documentation' | 'Practice';
  description: string;
  externalLink: string;
}

export interface VisualAuditItem {
  dimension: string;
  expectedStandard: string; // How it should be (Do's)
  pitfallsToAvoid: string; // How it shouldn't be (Don'ts)
  observedMetric: string; // What AI detected from candidate
  score: number; // 0-100
  verdict: 'Excellent' | 'Exceptional' | 'Pass' | 'Needs Improvement' | 'Critical Warning';
}

export interface VideoEvidenceItem {
  id: string;
  timestamp: string;
  phase?: string;
  snapshotUrl?: string;
  metricLabel: string;
  observation: string;
  posture?: string;
  attire?: string;
  eyeContact?: string;
  status: 'Pass' | 'Attention' | 'Flagged';
}

/** Camera tutor output: computed from per-frame vision analysis after the interview. */
export interface VisualTutorAudit {
  framesCaptured: number;
  framesAnalysed: number;
  framesFailed: number;
  unavailable?: boolean;
  summary?: string;
  attributes: { key: string; label: string; good: number; frames: number; percent: number }[];
  attire: { verdict: string; style: string | null; frames: number; notes: string[] };
  timeline: { at: string; offsetSec: number; notes: string[] }[];
  fixes: { issue: string; fix: string; frames: number; of: number }[];
  model?: string;
}

export interface InterviewReport {
  sessionId: string;
  createdAt: string;
  jobRole: string;
  companyTarget?: string;
  interviewType: string;
  persona: string;
  durationSeconds: number;
  overallScore: number;
  grade: GradeType;
  dimensions: DimensionScore[];
  strengths: FeedbackStrength[];
  improvements: FeedbackImprovement[];
  questionAnalysis: QuestionFeedbackItem[];
  communicationStats: CommunicationMetrics;
  weakTopics: WeakTopicItem[];
  nextRecommendation: {
    recommendedInterviewType: string;
    focusAreas: string[];
    readinessComment: string;
  };
  resources: CuratedResource[];
  visualAudit?: VisualTutorAudit | null;
  progressComparison?: {
    currentScore: number;
    previousScore: number;
    delta: number;
    trend: 'improving' | 'declining' | 'stable';
    historyPoints: { date: string; score: number }[];
  };
  shareToken?: string;
  improvementAnalysis?: ImprovementAnalysis | null;
}

export interface ImprovementAnalysis {
  currentScore: number;
  targetScore: number;
  targetLabel: string;
  gap: number;
  readyNow: boolean;
  dimensionGaps: { name: string; key: string; score: number; target: number; gap: number; weightPercentage: number; pointsGain: number }[];
  fastestPath: string[];
  topicsToImprove: { topic: string; score: number; target: number; gap: number; priority: string; earlierAverage: number | null; missingConcepts: string[] }[];
  conceptsToLearn: { concept: string; timesMissed: number; topics: string[]; missedBefore: boolean }[];
  recurringWeaknesses: { concept: string; times: number }[];
  history: {
    interviewsBefore: number;
    previousScore: number | null;
    previousAverage: number | null;
    change: number | null;
    recentScores: { score: number; date: string }[];
  };
  summary: string;
  narrative: string[];
  studyFocus: string[];
  narrativeSource: string;
}

