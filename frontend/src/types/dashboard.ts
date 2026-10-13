export interface ReadinessMetric {
  score: number;
  previousScore: number;
  delta: number;
  trend: 'up' | 'down' | 'neutral';
  percentileRank: number;
  cohortSize?: number;
  statusLabel: string;
}

export interface ScoreTimelinePoint {
  date: string;
  interviewScore: number | null;
  aptitudeScore?: number | null;
  interviewType?: string;
}

export interface TopicMasteryItem {
  topic: string;
  category: 'Aptitude' | 'Core CS' | 'System Design' | 'Behavioral';
  score: number; // 0-100
  status: 'Strong' | 'Average' | 'Weak';
  lastPracticed: string;
}

export interface CompanyReadinessCardData {
  companyId: string;
  companyName: string;
  readinessPercentage: number;
  practiceCount: number;
  trend: 'up' | 'down' | 'stable';
  cutoffConfidence: 'High' | 'Moderate' | 'Low';
}

export interface DailyStudyTask {
  id: string;
  topic: string;
  description: string;
  durationMinutes: number;
  isCompleted: boolean;
  priority: 'High' | 'Normal';
}

export interface StudentDashboardData {
  studentName: string;
  targetRole: string;
  targetCompany?: string | null;
  placementCountdownDays?: number | null;
  readiness: ReadinessMetric;
  scoreTimeline: ScoreTimelinePoint[];
  topicHeatmap: TopicMasteryItem[];
  aptitudeCategoryAccuracy: {
    category: string;
    accuracyPercentage: number;
    testsTaken: number;
  }[];
  companyReadiness: CompanyReadinessCardData[];
  studyPlan: {
    todayTasks: DailyStudyTask[];
    totalProgressPercentage: number;
    daysAheadOrBehind: number;
  };
  gamification: {
    currentStreak: number;
    longestStreak: number;
    totalXp: number;
    level: number;
    levelTitle: string;
    levelProgress?: number;
    xpToNextLevel: number;
    nextMilestoneTitle: string;
  };
  recentSessions: {
    id: string;
    date: string;
    title: string;
    type: 'Interview' | 'Aptitude';
    score: number;
    status: string;
  }[];
  aiDailyDigest: {
    headline: string;
    recommendedAction: string;
    weakestTopic: string;
    streakMotivation: string;
  };
}

export interface ProgressAnalytics {
  range: string;
  kpis: {
    averageMockScore: number | null;
    mockScoreDelta: number | null;
    averageAptitudeScore: number | null;
    aptitudeTests: number;
    interviewMinutes: number;
    mockRounds: number;
    percentile: number | null;
    cohortSize: number;
  };
  timeline: { date: string; interview: number | null; aptitude: number | null }[];
  categoryAccuracy: { name: string; accuracy: number }[];
}

export interface GamificationData {
  level: number;
  levelTitle: string;
  levelProgress: number;
  xpToNextLevel: number;
  totalXp: number;
  currentStreak: number;
  longestStreak: number;
  badges: { id: string; title: string; desc: string; icon: string; unlocked: boolean }[];
  leaderboard: { rank: number; name: string; college: string; score: number | null; xp: number; streak: number; isUser: boolean }[];
}
