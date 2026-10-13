export interface CompanySection {
  name: string;
  questionCount: number;
  timeLimitMinutes: number;
  topics: string[];
}

export interface Company {
  id: string;
  slug: string;
  name: string;
  logoUrl?: string;
  tier: 'Tier-1 Product' | 'IT Giant' | 'High-Growth Tech' | 'Consulting';
  rolesHired: string[];
  testFormat: string;
  sections: CompanySection[];
  totalQuestions: number;
  totalDurationMinutes: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  averagePackage: string;
  hiringOverview: string;
  interviewProcess: string[];
  keyPreparationTips: string[];
}
