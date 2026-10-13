import { apiClient } from './client';
import { AppNotification } from '../types/notification';
import { NotificationPreference } from '../types/user';

export const notificationsApi = {
  async getNotifications(): Promise<AppNotification[]> {
    const res = await apiClient.get<AppNotification[]>('/users/me/notifications');
    return Array.isArray(res.data) ? res.data : [];
  },

  async markAsRead(id: string): Promise<void> {
    await apiClient.put(`/users/me/notifications/${id}/read`);
  },

  async getPreferences(): Promise<NotificationPreference> {
    const res = await apiClient.get<NotificationPreference>('/users/me/notifications/preferences');
    return res.data;
  },

  async updatePreferences(prefs: Partial<NotificationPreference>): Promise<NotificationPreference> {
    const res = await apiClient.put<NotificationPreference>('/users/me/notifications/preferences', prefs);
    return res.data;
  }
};
