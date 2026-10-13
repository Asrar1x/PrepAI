export interface BatchMetrics {
  totalRegistered: number;
  activeThisWeek: number;
  averageInterviewScore: number;
  averageAptitudeScore: number;
  placementReadinessRate: number; // percentage
  drivesScheduled: number;
}

export interface ScoreDistributionBin {
  scoreRange: string; // "0-20", "21-40", etc.
  studentCount: number;
}

export interface EngagementTrendPoint {
  week: string;
  interviewsTaken: number;
  aptitudeTestsTaken: number;
}

export interface WeakTopicMatrixRow {
  topic: string;
  category: string;
  averageScore: number;
  strugglingStudentsCount: number;
  percentageStruggling: number;
  severity: 'Critical' | 'Warning' | 'Healthy';
}

export interface AdminCompanyReadinessRow {
  companyId: string;
  companyName: string;
  visitingDate?: string;
  eligibleStudentsCount: number;
  interviewReadyCount: number;
  readinessPercentage: number;
  averageMockScore: number;
  trend: 'improving' | 'declining' | 'stable';
}

export interface AdminStudentSummary {
  id: string;
  name: string;
  email: string;
  department: string;
  batchYear: number;
  targetRole: string;
  lastActive: string;
  readinessScore: number;
  interviewsCompleted: number;
  latestInterviewId?: string | null;
  aptitudeCompleted: number;
  streak: number;
  xp: number;
  placementStatus: 'Placed' | 'In Process' | 'Not Started';
}

export interface DriveActivationPayload {
  companyName: string;
  targetBatch: string;
  durationDays: number;
  focusTopics: string[];
  mandatoryMockRounds: number;
}

export interface InterviewEventPayload {
  eventName: string;
  scheduledDate: string;
  scheduledTime: string;
  roleTitle: string;
  companyName: string;
  batchName: string;
  participatingStudentsLimit?: number;
}

export interface QuestionUploadStats {
  totalRows: number;
  acceptedRows: number;
  rejectedRows: number;
  errors: { row: number; reason: string }[];
}
