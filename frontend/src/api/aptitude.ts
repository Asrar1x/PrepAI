import { apiClient } from './client';
import {
  AptitudeSessionConfig,
  AptitudeSession,
  AptitudeResult,
  AptitudeHistoryEntry,
  DailyQuest
} from '../types/aptitude';

export const aptitudeApi = {
  async startSession(config: AptitudeSessionConfig & { mode?: 'adaptive' | 'daily' }): Promise<AptitudeSession> {
    const res = await apiClient.post<AptitudeSession>('/aptitude/start', config);
    return res.data;
  },

  async getSession(sessionId: string): Promise<AptitudeSession> {
    const res = await apiClient.get<AptitudeSession>(`/aptitude/${sessionId}`);
    return res.data;
  },

  // Records one answer as it is saved so the server can time each question
  async recordAnswer(sessionId: string, questionId: string, selectedOption: string): Promise<void> {
    await apiClient.post(`/aptitude/${sessionId}/answer`, { questionId, selectedOption });
  },

  async submitAnswers(sessionId: string, answers: Record<string, string>): Promise<AptitudeResult> {
    const res = await apiClient.post<AptitudeResult>(`/aptitude/${sessionId}/submit`, { answers });
    return res.data;
  },

  async getResult(sessionId: string): Promise<AptitudeResult> {
    const res = await apiClient.get<AptitudeResult>(`/aptitude/${sessionId}/report`);
    return res.data;
  },

  async getHistory(): Promise<AptitudeHistoryEntry[]> {
    const res = await apiClient.get<any[]>('/aptitude/history');
    if (!Array.isArray(res.data)) return [];
    return res.data.map(s => {
      const answered = (s.correctCount || 0) + (s.wrongCount || 0);
      return {
        sessionId: s._id || s.id,
        date: s.createdAt,
        role: s.jobRole || 'N/A',
        company: (s.companyPattern || '').toUpperCase(),
        durationMinutes: s.durationMinutes || 0,
        scorePercentage: s.score || 0,
        accuracyPercentage: answered > 0 ? Math.round(((s.correctCount || 0) / answered) * 100) : 0,
        status: (s.status === 'completed' ? 'Completed' : 'Timed Out') as 'Completed' | 'Timed Out'
      };
    });
  },

  async getDailyQuest(): Promise<DailyQuest & { sessionId: string | null }> {
    const res = await apiClient.get<any>('/aptitude/daily');
    const d = res.data;
    return {
      id: `daily-quest-${new Date().toISOString().split('T')[0]}`,
      date: new Date().toISOString().split('T')[0],
      title: d.drill_title,
      category: 'Mixed Aptitude',
      questionCount: d.questions_count,
      completedQuestions: d.completed_questions,
      xpReward: d.xp_reward,
      streakBonus: d.streak,
      isCompleted: Boolean(d.is_completed),
      expiresInHours: d.expires_in_hours,
      sessionId: d.session_id
    };
  }
};
