export type InterviewRoundType = 
  | 'HR Round' 
  | 'Technical Round' 
  | 'Combined Round' 
  | 'Resume Based' 
  | 'Case Study / PM Round';

export type InterviewPersona = 
  | 'Corporate HR' 
  | 'Technical Lead' 
  | 'Startup Founder' 
  | 'Panel Interviewer';

export type InterviewPhase = 
  | 'Introduction'
  | 'Background Verification'
  | 'Core Questions'
  | 'Counter-Question Layer'
  | 'Situational / Behavioral'
  | 'Candidate Questions'
  | 'Wrap-Up';

export interface PersonaInfo {
  id: InterviewPersona;
  name: string;
  roleTitle: string;
  style: string;
  description: string;
  avatarSeed: string;
}

export interface TranscriptMessage {
  id: string;
  speaker: 'ai' | 'student';
  text: string;
  timestamp: string;
  partial?: boolean;
}

export interface InterviewConfig {
  jobRole: string;
  companyTarget?: string;
  interviewType: InterviewRoundType;
  persona: InterviewPersona;
}

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected';
export type AvatarState = 'idle' | 'speaking' | 'listening' | 'thinking' | 'disconnected' | 'connecting';

export interface InterviewSession {
  sessionId: string;
  jobRole: string;
  companyTarget?: string;
  interviewType: InterviewRoundType;
  persona: InterviewPersona;
  status: 'active' | 'completed' | 'processing';
  durationSeconds: number;
  currentQuestionNumber: number;
  totalQuestionsPlanned: number;
  currentPhase: InterviewPhase;
  currentPhaseIndex: number;
  transcript: TranscriptMessage[];
  startedAt: string;
  liveKitToken?: string;
  liveKitUrl?: string;
  resumeContext?: any;
  greeting?: string;
}

export interface EndInterviewSummary {
  sessionId: string;
  durationSeconds: number;
  questionCount: number;
  processingStatus: 'processing' | 'ready' | 'failed';
  reportId?: string;
}
