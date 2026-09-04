export type RoleCategory =
  | 'Core Software Engineering'
  | 'DevOps & Cloud'
  | 'Data & AI'
  | 'Product & Business'
  | 'Quality & Security'
  | 'Design & Non-Tech';

export type Difficulty = 'Foundation' | 'Growing' | 'Advanced';

export interface RoleSkill {
  name: string;
  priority: 'essential' | 'important' | 'useful';
  description: string;
}

export interface InterviewRound {
  name: string;
  duration: string;
  focus: string;
}

export interface Role {
  id: string;
  slug: string;
  title: string;
  category: RoleCategory;
  salaryRange: string;
  difficulty: Difficulty;
  description: string;
  skills: string[];
  requiredSkills: RoleSkill[];
  interviewRounds: InterviewRound[];
  companySlugs: string[];
  hiringSignal: string;
  updatedAt: string;
}

export interface RoleListFilters {
  query?: string;
  category?: RoleCategory | 'All';
}
