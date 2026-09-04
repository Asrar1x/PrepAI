export type InterviewKind = 'technical' | 'behavioural' | 'mixed' | 'resume';
export type InterviewDifficulty = 'foundation' | 'standard' | 'stretch';
export type InterviewPhase = 'introduction' | 'technical' | 'reflection' | 'closing';
export type InterviewStatus = 'scheduled' | 'in_progress' | 'ended' | 'processing' | 'completed';
export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'offline';

export interface InterviewConfiguration {
  kind: InterviewKind;
  difficulty: InterviewDifficulty;
  durationMinutes: 20 | 30 | 45;
  targetRole: string;
  company: string;
  persona: string;
  resumeId?: string;
}

export interface InterviewSetupData {
  roles: string[];
  companies: string[];
  personas: Array<{ id: string; name: string; description: string }>;
  resumes: Array<{ id: string; name: string; status: 'completed' | 'parsing' }>;
  defaultConfiguration: InterviewConfiguration;
}

export interface TranscriptTurn {
  id: string;
  speaker: 'interviewer' | 'student' | 'system';
  text: string;
  timestamp: string;
  partial?: boolean;
}

export interface InterviewSession {
  id: string;
  configuration: InterviewConfiguration;
  status: InterviewStatus;
  phase: InterviewPhase;
  startedAt: string;
  expiresAt: string;
  interviewerName: string;
  interviewerTitle: string;
  connectionStatus: ConnectionStatus;
  transcript: TranscriptTurn[];
}

export interface InterviewHistoryItem {
  id: string;
  title: string;
  kind: InterviewKind;
  company: string;
  completedAt: string;
  durationMinutes: number;
  score: number;
  status: 'completed' | 'processing';
}

export interface CreateInterviewInput extends InterviewConfiguration {}

export const interviewKindLabels: Record<InterviewKind, string> = {
  technical: 'Technical round',
  behavioural: 'Behavioural round',
  mixed: 'Mixed simulation',
  resume: 'Resume-led round',
};

export const difficultyLabels: Record<InterviewDifficulty, string> = {
  foundation: 'Foundation',
  standard: 'Standard',
  stretch: 'Stretch',
};
