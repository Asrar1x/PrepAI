import { apiClient } from './client';
import { InterviewConfig, InterviewSession, TranscriptMessage, EndInterviewSummary } from '../types/interview';
import { InterviewReport } from '../types/report';

export interface TurnSpeechSignals {
  inputMode: 'voice' | 'text';
  responseLatencyMs?: number;
  speakingDurationMs?: number;
  interrupted?: boolean;
  interruptionCount?: number;
}

export interface ReportProgress {
  sessionId: string;
  reportStatus: 'none' | 'processing' | 'ready' | 'partial' | 'failed';
  reportError: string | null;
  answersEvaluated: number;
  answersTotal: number;
  durationSeconds: number;
}

/** Thrown while the server is still generating a report (HTTP 202). */
export class ReportProcessingError extends Error {
  constructor() {
    super('Your report is still being generated.');
    this.name = 'ReportProcessingError';
  }
}

export const interviewApi = {
  async startInterview(config: InterviewConfig): Promise<InterviewSession> {
    const res = await apiClient.post<InterviewSession>('/interviews/start', config);
    if (!res.data?.sessionId) {
      throw new Error('The server did not return an interview session.');
    }
    return res.data;
  },

  async sendDialogueTurn(
    sessionId: string,
    userTranscript: string,
    jobRole: string,
    persona: string,
    speech?: TurnSpeechSignals
  ): Promise<{ aiResponse: string; nextPhaseIndex?: number }> {
    const res = await apiClient.post<any>(`/interviews/${sessionId}/answer`, {
      answer: userTranscript,
      jobRole,
      persona,
      speech
    }, { timeout: 120000 });

    const responseText = res.data?.aiResponse || res.data?.response || res.data?.reply;
    if (!responseText) {
      throw new Error('The interviewer did not return a reply.');
    }
    return {
      aiResponse: responseText,
      nextPhaseIndex: typeof res.data?.nextPhaseIndex === 'number' ? res.data.nextPhaseIndex : undefined
    };
  },

  // The server evaluates the stored transcript; the client copy is not needed.
  async endInterview(sessionId: string, _transcript?: TranscriptMessage[]): Promise<EndInterviewSummary> {
    void _transcript;
    const res = await apiClient.post<any>(`/interviews/${sessionId}/complete`, {}, { timeout: 60000 });
    return {
      sessionId: res.data.sessionId,
      durationSeconds: res.data.durationSeconds,
      questionCount: res.data.questionCount,
      processingStatus: res.data.processingStatus || 'ready',
      reportId: res.data.reportId || res.data.sessionId
    };
  },

  async getSession(sessionId: string): Promise<InterviewSession> {
    const res = await apiClient.get<InterviewSession>(`/interviews/${sessionId}`);
    return res.data;
  },

  async getReport(sessionId: string): Promise<InterviewReport> {
    const res = await apiClient.get<InterviewReport>(`/interviews/${sessionId}/report`, { timeout: 60000 });
    if (res.status === 202) throw new ReportProcessingError();
    return res.data;
  },

  async getSharedReport(token: string): Promise<InterviewReport> {
    const res = await apiClient.get<InterviewReport>(`/interviews/shared/${token}/report`);
    if (res.status === 202) throw new ReportProcessingError();
    return res.data;
  },

  async downloadReportPdf(sessionId: string): Promise<void> {
    const res = await apiClient.get<Blob>(`/interviews/${sessionId}/report.pdf`, { responseType: 'blob', timeout: 60000 });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prepai_report_${sessionId}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },

  async uploadFrame(sessionId: string, dataUrl: string, offsetSec: number): Promise<{ stored: boolean; frames: number }> {
    const res = await apiClient.post<{ stored: boolean; frames: number }>(`/interviews/${sessionId}/frames`, { dataUrl, offsetSec }, { timeout: 30000 });
    return res.data;
  },

  async getProgress(sessionId: string): Promise<ReportProgress> {
    const res = await apiClient.get<ReportProgress>(`/interviews/${sessionId}/progress`);
    return res.data;
  },

  async retryReport(sessionId: string): Promise<void> {
    await apiClient.post(`/interviews/${sessionId}/report/retry`);
  }
};
