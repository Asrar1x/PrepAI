import { User } from './auth';

export type { User };

export interface UserProfileUpdate {
  name?: string;
  collegeName?: string;
  branch?: string;
  graduationYear?: number;
  targetRoles?: string[];
  targetCompanies?: string[];
}

export interface NotificationPreference {
  dailyReminder: boolean;
  interviewReportReady: boolean;
  streakAlert: boolean;
  companyDriveActivated: boolean;
  weeklyProgressReport: boolean;
  placementCountdown: boolean;
  studyPlanBehind: boolean;
  pushEnabled: boolean;
  whatsappEnabled: boolean;
}
