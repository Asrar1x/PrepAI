import { z } from 'zod';

export const userProfileSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  collegeName: z.string().min(2, 'College name is required'),
  branch: z.string().min(2, 'Branch is required'),
  graduationYear: z.coerce.number().min(2023).max(2032),
  targetRole: z.string().optional(),
  targetCompany: z.string().optional(),
});

export const notificationSettingsSchema = z.object({
  dailyReminder: z.boolean().default(true),
  interviewReportReady: z.boolean().default(true),
  streakAlert: z.boolean().default(true),
  companyDriveActivated: z.boolean().default(true),
  weeklyProgressReport: z.boolean().default(false),
  placementCountdown: z.boolean().default(true),
  studyPlanBehind: z.boolean().default(true),
  pushEnabled: z.boolean().default(false),
  whatsappEnabled: z.boolean().default(false),
});
