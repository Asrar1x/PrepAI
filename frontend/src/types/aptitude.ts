export type AptitudeCategory = 
  | 'Quantitative Aptitude'
  | 'Logical Reasoning'
  | 'Verbal Ability'
  | 'Data Interpretation'
  | 'Technical Aptitude'
  | 'Pseudo-Code Analysis'
  | 'Coding Section';

export type AptitudeDifficulty = 'Easy' | 'Medium' | 'Hard';

export interface AptitudeOption {
  id: 'A' | 'B' | 'C' | 'D';
  text: string;
}

export interface AptitudeQuestion {
  id: string;
  category: AptitudeCategory;
  subCategory?: string;
  difficulty: AptitudeDifficulty;
  questionText: string;
  codeSnippet?: string;
  options: AptitudeOption[];
  correctAnswer?: 'A' | 'B' | 'C' | 'D';
  explanation?: string;
  concept?: string;
  stepByStep?: string[];
  shortcut?: string;
  commonMistake?: string;
  memoryTip?: string;
}

export interface AptitudeSessionConfig {
  jobRole: string;
  companyPattern?: string;
  durationMinutes: number; // 30, 60, 90
}

export interface AptitudeSession {
  sessionId: string;
  jobRole: string;
  companyPattern?: string;
  durationMinutes: number;
  totalQuestions: number;
  currentQuestionIndex: number;
  timeRemainingSeconds: number;
  status: 'active' | 'completed' | 'timed_out';
  questions: AptitudeQuestion[];
  userAnswers: Record<string, 'A' | 'B' | 'C' | 'D'>;
}

export interface CategoryScore {
  category: string;
  totalQuestions: number;
  correct: number;
  scorePercentage: number;
}

export interface QuestionAnalysisItem {
  questionNumber: number;
  questionText: string;
  category: string;
  selectedAnswer?: string;
  correctAnswer: string;
  isCorrect: boolean;
  difficulty: AptitudeDifficulty;
  explanation: string;
  concept?: string;
  stepByStep?: string[];
  shortcut?: string;
}

export interface AptitudeResult {
  sessionId: string;
  overallScorePercentage: number;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  accuracyPercentage: number;
  timeUsedSeconds: number;
  categoryBreakdown: CategoryScore[];
  questionAnalysis: QuestionAnalysisItem[];
  xpEarned: number;
  streakMaintained: boolean;
}

export interface AptitudeHistoryEntry {
  sessionId: string;
  date: string;
  role: string;
  company?: string;
  durationMinutes: number;
  scorePercentage: number;
  accuracyPercentage: number;
  status: 'Completed' | 'Timed Out';
}

export interface DailyQuest {
  id: string;
  date: string;
  title: string;
  category: string;
  questionCount: number;
  completedQuestions: number;
  xpReward: number;
  streakBonus: number;
  isCompleted: boolean;
  expiresInHours: number;
}
