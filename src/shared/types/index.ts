export type UserRole = 'student' | 'placement_officer' | 'admin';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  collegeName?: string;
  branch?: string;
  graduationYear?: number;
  avatarUrl?: string | null;
  targetRoleSlugs?: string[];
}

export interface AuthSession {
  user: User;
  accessToken: string;
}

export type ApiStatus = 'success' | 'error';

export interface ApiEnvelope<T> {
  status: ApiStatus;
  data: T;
  message: string;
  request_id: string;
}

export interface ApiErrorPayload {
  code?: string;
  message: string;
  details?: Record<string, string[] | string | number | boolean | null>;
  requestId?: string;
}

export class AppError extends Error {
  readonly status?: number;
  readonly code?: string;
  readonly details?: ApiErrorPayload['details'];
  readonly requestId?: string;

  constructor(message: string, options: Omit<ApiErrorPayload, 'message'> & { status?: number } = {}) {
    super(message);
    this.name = 'AppError';
    this.status = options.status;
    this.code = options.code;
    this.details = options.details;
    this.requestId = options.requestId;
  }
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  items: T[];
  pagination: PaginationMeta;
}

export interface Role {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: string;
  salaryRange: string;
  difficulty: 'foundation' | 'intermediate' | 'advanced';
  skills: string[];
  interviewRounds: number;
  updatedAt: string;
}

export interface Company {
  id: string;
  slug: string;
  name: string;
  summary: string;
  industry: string;
  hiringSignal: 'active' | 'seasonal' | 'watch';
  salaryRange: string;
  assessmentSummary: string;
  updatedAt: string;
}

export interface StudyPlanDay {
  day: number;
  title: string;
  estimatedMinutes: number;
  status: 'locked' | 'available' | 'complete';
  tasks: Array<{ id: string; title: string; completed: boolean }>;
}

export interface StudyPlan {
  id: string;
  roleSlug: string;
  companySlug?: string;
  title: string;
  progress: number;
  days: StudyPlanDay[];
}

export type AptitudeQuestionKind = 'mcq' | 'essay' | 'pseudocode' | 'coding';

export interface AptitudeQuestion {
  id: string;
  kind: AptitudeQuestionKind;
  section: string;
  prompt: string;
  options?: Array<{ id: string; label: string }>;
  starterCode?: string;
  language?: string;
  marks: number;
}

export interface AptitudeAnswer {
  questionId: string;
  selectedOptionId?: string;
  text?: string;
  code?: string;
  markedForReview?: boolean;
}

export interface AptitudeSession {
  id: string;
  status: 'created' | 'in_progress' | 'submitted' | 'expired';
  mode: 'company' | 'role' | 'daily';
  roleSlug?: string;
  companySlug?: string;
  startedAt: string;
  expiresAt: string;
  questions: AptitudeQuestion[];
  answers?: AptitudeAnswer[];
}

export interface AptitudeResult {
  sessionId: string;
  score: number;
  percentile?: number;
  correctCount: number;
  totalQuestions: number;
  weakTopics: Array<{ topic: string; accuracy: number }>;
}

export type InterviewType = 'hr' | 'technical' | 'behavioral' | 'resume' | 'case';
export type InterviewStatus = 'created' | 'in_progress' | 'processing' | 'completed' | 'failed';

export interface InterviewSession {
  id: string;
  status: InterviewStatus;
  roleSlug: string;
  companySlug?: string;
  interviewType: InterviewType;
  persona: string;
  startedAt?: string;
  endedAt?: string;
  livekitUrl?: string;
  livekitToken?: string;
  phase?: string;
}

export interface TranscriptTurn {
  id: string;
  speaker: 'interviewer' | 'student';
  content: string;
  timestamp: string;
  isPartial?: boolean;
  latencyMs?: number;
}

export interface InterviewReport {
  sessionId: string;
  status: 'processing' | 'completed' | 'failed';
  overallScore?: number;
  dimensions?: Array<{ name: string; score: number; feedback: string }>;
  strengths?: string[];
  focusAreas?: string[];
  nextSteps?: string[];
  shareUrl?: string | null;
}

export type ResumeStatus = 'uploaded' | 'parsing' | 'completed' | 'failed';

export interface Resume {
  id: string;
  fileName: string;
  status: ResumeStatus;
  uploadedAt: string;
  atsScore?: number;
  hotspots?: string[];
  breakdown?: Array<{ label: string; score: number; detail: string }>;
  failureReason?: string;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  category: 'practice' | 'report' | 'admin' | 'system';
  createdAt: string;
  readAt?: string | null;
  href?: string;
}

export interface DashboardData {
  readiness: number;
  streakDays: number;
  placementCountdownDays: number;
  weeklyScores: Array<{ label: string; score: number }>;
  recentSessions: Array<{ id: string; title: string; kind: 'aptitude' | 'interview'; score?: number; createdAt: string }>;
  dailyDigest: string;
}

export interface BatchAnalytics {
  batchId: string;
  totalStudents: number;
  activeStudents: number;
  readinessAverage: number;
  weakTopics: Array<{ topic: string; score: number; affectedStudents: number }>;
  companyReadiness: Array<{ company: string; score: number }>;
}
