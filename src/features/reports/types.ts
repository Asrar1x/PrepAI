export type ReportState = 'processing' | 'ready' | 'failed';

export interface ScoreDimension {
  key: string;
  label: string;
  score: number;
  benchmark: number;
  note: string;
}

export interface ReportHighlight {
  type: 'strength' | 'focus';
  title: string;
  detail: string;
}

export interface AnswerReview {
  id: string;
  question: string;
  responseSummary: string;
  score: number;
  feedback: string;
}

export interface InterviewReport {
  sessionId: string;
  title: string;
  role: string;
  company: string;
  completedAt: string;
  durationMinutes: number;
  overallScore: number;
  percentile: number;
  dimensions: ScoreDimension[];
  highlights: ReportHighlight[];
  answerReviews: AnswerReview[];
  nextActions: Array<{ title: string; detail: string; href: string }>;
  shared: boolean;
}

export interface ReportStatus {
  sessionId: string;
  state: ReportState;
  progress: number;
  message: string;
}
