import { apiClient } from './client';
import { StudentDashboardData, ProgressAnalytics, GamificationData } from '../types/dashboard';

export const dashboardApi = {
  async getDashboard(): Promise<StudentDashboardData> {
    const res = await apiClient.get<StudentDashboardData>('/users/me/dashboard');
    return res.data;
  },

  async toggleStudyPlanTask(taskId: string, completed: boolean): Promise<{ success: boolean }> {
    await apiClient.put(`/users/me/study-plan/${encodeURIComponent(taskId)}`, { isCompleted: completed });
    return { success: true };
  },

  async getProgress(range: '7d' | '30d' | '90d' | 'all'): Promise<ProgressAnalytics> {
    const res = await apiClient.get<ProgressAnalytics>('/users/me/progress', { params: { range } });
    return res.data;
  },

  async getGamification(): Promise<GamificationData> {
    const res = await apiClient.get<GamificationData>('/users/me/gamification');
    return res.data;
  }
};
