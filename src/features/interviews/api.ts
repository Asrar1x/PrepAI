import type {
  CreateInterviewInput,
  InterviewHistoryItem,
  InterviewSession,
  InterviewSetupData,
  TranscriptTurn,
} from './types';

const pause = (milliseconds = 420) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

const setup: InterviewSetupData = {
  roles: ['Software Development Engineer', 'Data Analyst', 'Frontend Engineer', 'Product Analyst'],
  companies: ['Amazon', 'TCS Digital', 'Zoho', 'Razorpay'],
  personas: [
    { id: 'maya', name: 'Maya Rao', description: 'Direct, structured technical lead' },
    { id: 'arjun', name: 'Arjun Kapoor', description: 'Warm, practical hiring manager' },
    { id: 'devika', name: 'Devika Nair', description: 'Curious product interviewer' },
  ],
  resumes: [{ id: 'resume-main', name: 'Mohan_SDE_Resume.pdf', status: 'completed' }],
  defaultConfiguration: {
    kind: 'technical',
    difficulty: 'standard',
    durationMinutes: 30,
    targetRole: 'Software Development Engineer',
    company: 'Amazon',
    persona: 'Maya Rao',
    resumeId: 'resume-main',
  },
};

const baseTranscript: TranscriptTurn[] = [
  {
    id: 'turn-1',
    speaker: 'interviewer',
    text: 'Welcome, Mohan. I’ll be listening for how you structure your thinking, not just the final answer.',
    timestamp: '00:08',
  },
  {
    id: 'turn-2',
    speaker: 'student',
    text: 'Thank you. I’m ready to walk through my approach as I go.',
    timestamp: '00:18',
  },
  {
    id: 'turn-3',
    speaker: 'interviewer',
    text: 'Great. Tell me how you would design a notification system that can serve both immediate and batched updates.',
    timestamp: '00:26',
  },
];

const sessionStore = new Map<string, InterviewSession>();
let nextSession = 12;

function buildSession(id: string, input: CreateInterviewInput): InterviewSession {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + input.durationMinutes * 60_000);
  return {
    id,
    configuration: input,
    status: 'in_progress',
    phase: 'technical',
    startedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    interviewerName: input.persona,
    interviewerTitle: input.kind === 'behavioural' ? 'Hiring manager' : 'AI technical interviewer',
    connectionStatus: 'connected',
    transcript: baseTranscript,
  };
}

const demoSession = buildSession('demo-live', setup.defaultConfiguration);
sessionStore.set(demoSession.id, demoSession);

export async function getInterviewSetup(): Promise<InterviewSetupData> {
  await pause();
  return setup;
}

export async function createInterview(input: CreateInterviewInput): Promise<InterviewSession> {
  await pause(680);
  const id = `int-${nextSession++}`;
  const session = buildSession(id, input);
  sessionStore.set(id, session);
  return session;
}

export async function getInterviewSession(id: string): Promise<InterviewSession> {
  await pause(260);
  const session = sessionStore.get(id) ?? demoSession;
  return { ...session, transcript: [...session.transcript] };
}

export async function reconnectInterview(id: string): Promise<InterviewSession> {
  await pause(720);
  const session = sessionStore.get(id) ?? demoSession;
  const updated = { ...session, connectionStatus: 'connected' as const };
  sessionStore.set(id, updated);
  return updated;
}

export async function appendTranscriptTurn(id: string, turn: TranscriptTurn): Promise<InterviewSession> {
  await pause(140);
  const session = sessionStore.get(id) ?? demoSession;
  const updated = { ...session, transcript: [...session.transcript, turn] };
  sessionStore.set(id, updated);
  return updated;
}

export async function endInterview(id: string): Promise<InterviewSession> {
  await pause(540);
  const session = sessionStore.get(id) ?? demoSession;
  const updated = { ...session, status: 'processing' as const, connectionStatus: 'offline' as const };
  sessionStore.set(id, updated);
  return updated;
}

export async function getInterviewHistory(): Promise<InterviewHistoryItem[]> {
  await pause();
  return [
    { id: 'int-10', title: 'Amazon SDE simulation', kind: 'technical', company: 'Amazon', completedAt: '2026-08-21T11:15:00.000Z', durationMinutes: 29, score: 86, status: 'completed' },
    { id: 'int-09', title: 'Career-story practice', kind: 'behavioural', company: 'General', completedAt: '2026-08-19T07:45:00.000Z', durationMinutes: 21, score: 78, status: 'completed' },
    { id: 'int-08', title: 'Razorpay engineering round', kind: 'mixed', company: 'Razorpay', completedAt: '2026-08-16T12:10:00.000Z', durationMinutes: 42, score: 81, status: 'completed' },
  ];
}
