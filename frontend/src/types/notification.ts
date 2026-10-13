export type NotificationType = 
  | 'daily_reminder'
  | 'report_ready'
  | 'streak_alert'
  | 'company_drive'
  | 'weekly_report'
  | 'event_scheduled'
  | 'system';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  actionUrl?: string;
  severity?: 'info' | 'success' | 'warning' | 'error';
}

export interface BadgeItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: string;
  isUnlocked: boolean;
  category: 'interview' | 'aptitude' | 'streak' | 'ats';
}

export interface LeaderboardUser {
  rank: number;
  userId: string;
  displayName: string;
  avatarSeed: string;
  college: string;
  readinessScore: number;
  xpPoints: number;
  streakCount: number;
  isCurrentUser?: boolean;
}
