import type { InterviewReport, ReportStatus } from './types';

const pause = (milliseconds = 400) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
const checkCounts = new Map<string, number>();
const shareStates = new Map<string, boolean>();

const report: InterviewReport = {
  sessionId: 'demo-live',
  title: 'Amazon SDE simulation',
  role: 'Software Development Engineer',
  company: 'Amazon',
  completedAt: '2026-08-22T08:40:00.000Z',
  durationMinutes: 29,
  overallScore: 86,
  percentile: 84,
  dimensions: [
    { key: 'structure', label: 'Answer structure', score: 89, benchmark: 76, note: 'Clear framing and purposeful transitions.' },
    { key: 'depth', label: 'Technical depth', score: 83, benchmark: 74, note: 'Strong fundamentals; add operational trade-offs.' },
    { key: 'clarity', label: 'Communication', score: 91, benchmark: 78, note: 'Measured pace and easy-to-follow explanations.' },
    { key: 'ownership', label: 'Ownership', score: 87, benchmark: 75, note: 'You made decisions and explained why.' },
    { key: 'problem', label: 'Problem solving', score: 82, benchmark: 73, note: 'Sound approach; quantify edge cases sooner.' },
    { key: 'company', label: 'Company context', score: 78, benchmark: 72, note: 'Bring one product-specific example next time.' },
    { key: 'presence', label: 'Interview presence', score: 88, benchmark: 77, note: 'Composed, collaborative and succinct.' },
  ],
  highlights: [
    { type: 'strength', title: 'You made your thinking visible', detail: 'Your system design answer stated assumptions before proposing components—a habit interviewers can score.' },
    { type: 'strength', title: 'Your pace stayed controlled', detail: 'You used short pauses to organise answers, without sounding unsure.' },
    { type: 'focus', title: 'Add a failure mode sooner', detail: 'Mention retries, queues, and observability before diving into implementation details.' },
    { type: 'focus', title: 'Use Amazon product language', detail: 'Anchor one answer in customer impact, scale, or operational excellence.' },
  ],
  answerReviews: [
    { id: 'a1', question: 'How would you design notification delivery for immediate and batched updates?', responseSummary: 'Separated delivery paths and introduced a queue for asynchronous work.', score: 84, feedback: 'Great system boundary. Open with volume assumptions and describe retry ownership earlier.' },
    { id: 'a2', question: 'Tell me about a time you changed your approach after feedback.', responseSummary: 'Shared a hackathon example and linked the feedback to a concrete redesign.', score: 90, feedback: 'Strong STAR structure. Add a measurable outcome to make the impact more memorable.' },
  ],
  nextActions: [
    { title: 'Run a system-design drill', detail: 'Practise trade-offs, queues, and failure recovery in 15 minutes.', href: '/aptitude/daily' },
    { title: 'Rehearse with your resume', detail: 'Turn your strongest project into a concise impact story.', href: '/resume' },
  ],
  shared: false,
};

export async function getReportStatus(sessionId: string): Promise<ReportStatus> {
  await pause(280);
  const count = (checkCounts.get(sessionId) ?? 0) + 1;
  checkCounts.set(sessionId, count);
  if (count < 2) {
    return { sessionId, state: 'processing', progress: 58 + count * 19, message: 'Scoring transcript evidence and speech patterns' };
  }
  return { sessionId, state: 'ready', progress: 100, message: 'Your report is ready' };
}

export async function getInterviewReport(sessionId: string): Promise<InterviewReport> {
  await pause();
  return { ...report, sessionId, shared: shareStates.get(sessionId) ?? report.shared };
}

export async function setReportSharing(sessionId: string, shared: boolean): Promise<InterviewReport> {
  await pause(330);
  shareStates.set(sessionId, shared);
  return { ...report, sessionId, shared };
}
