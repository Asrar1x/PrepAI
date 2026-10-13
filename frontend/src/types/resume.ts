export interface ATSDimension {
  id: string;
  name: string;
  score: number; // 0 - 100
  weight: number;
  explanation: string;
  recommendations: string[];
}

export interface ResumeHotspot {
  id: string;
  category: 'Project' | 'Skill' | 'Experience' | 'Achievement' | 'Certification';
  title: string;
  detail: string;
  potentialQuestions: string[];
}

export interface ATSScoreResult {
  overallScore: number;
  parsedName?: string;
  extractedRoles?: string[];
  dimensions: ATSDimension[];
  hotspots: ResumeHotspot[];
  detectedKeywords: string[];
  missingKeywords: string[];
  wordCount: number;
  formatCheck: 'Valid ATS-Friendly' | 'Needs Review';
}

export interface BulletImprovement {
  id: string;
  originalText: string;
  improvedVariants: {
    variant: string;
    focus: 'Quantified Impact' | 'Strong Action Verb' | 'Tech Leadership';
    metricsAdded: boolean;
  }[];
}
