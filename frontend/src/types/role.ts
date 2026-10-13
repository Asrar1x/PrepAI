export type RoleCategory = 'Software' | 'Data' | 'Management' | 'Non-Tech';

export interface SkillItem {
  id: string;
  name: string;
  category: 'Technical' | 'Soft' | 'Domain';
  proficiencyRequired: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  description?: string;
  frequencyScore?: number;
}

export interface CompanyHiringPattern {
  companyId: string;
  companyName: string;
  roleTitle: string;
  testFormat: string;
  sections: string[];
  durationMinutes: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  salaryRange: string;
  cutoffScore?: number;
}

export interface InterviewRoundStructure {
  roundNumber: number;
  name: string;
  description: string;
  evaluates: string[];
  durationMinutes: number;
  eliminationRate?: string;
}

export interface Role {
  id: string;
  slug: string;
  title: string;
  category: RoleCategory;
  shortDescription: string;
  fullDescription: string;
  salaryRange: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  topSkills: string[];
  skills?: string[];
  description?: string;
  demandLevel?: string;
  technicalSkills: SkillItem[];
  softSkills: SkillItem[];
  hiringCompanies: string[];
  interviewStructure: InterviewRoundStructure[];
  companyPatterns: CompanyHiringPattern[];
  popularityScore?: number;
}

export type SkillProficiency = 'strong' | 'okay' | 'weak';

export interface SkillGapAnalysisRequest {
  roleSlug: string;
  skillRatings: Record<string, SkillProficiency>;
}

export interface StudyPlanTask {
  id: string;
  dayNumber: number;
  topic: string;
  description: string;
  estimatedMinutes: number;
  isCompleted: boolean;
  resourceLink?: string;
}

export interface SkillGapAnalysisResponse {
  roleTitle: string;
  overallReadiness: number;
  strengths: string[];
  weaknesses: string[];
  generatedStudyPlan: StudyPlanTask[];
}
