// API client for the Role & Company Intelligence Engine (Module 1 backend).
// Talks to /intelligence/* on the FastAPI service.
import { apiRequest } from '@/shared/api/client';

export interface ApiRole {
  slug: string;
  title: string;
  category: string;
  summary: string;
  salary_range: string;
  difficulty: string;
  interview_rounds: number;
  skills: string[];
}

export interface ApiCompanyListItem {
  slug: string;
  name: string;
  industry: string;
  hiring_signal: string;
  salary_range: string;
  assessment_summary: string;
}

export interface ApiCompanyPattern extends ApiCompanyListItem {
  sections: Array<{
    name: string;
    questions: number;
    duration_minutes: number;
    topics: string[];
  }>;
  timings: Record<string, unknown>;
  distribution: Record<string, number>;
  negative_marking: Record<string, unknown>;
}

export interface ApiStudyPlan {
  id: string;
  user_id: string;
  role_slug: string;
  company_slug: string | null;
  plan: {
    days: Array<{
      day: number;
      title: string;
      focus_area: string;
      estimated_minutes: number;
      tasks: string[];
      resources: Array<{ title: string; url: string }>;
    }>;
    role_specific_tips: string;
    weekly_milestones: string[];
    estimated_readiness_pct: number;
  };
  progress: number;
  created_at: string | null;
}

export interface SkillGapPayload {
  role_slug: string;
  company_slug?: string | null;
  ratings: Record<string, 'strong' | 'okay' | 'weak' | 'not_learned'>;
}

export async function listRolesFromApi(category?: string): Promise<ApiRole[]> {
  return apiRequest<ApiRole[]>({
    url: '/intelligence/roles',
    method: 'GET',
    params: category ? { category } : undefined,
  });
}

export async function listCompaniesFromApi(signal?: string): Promise<ApiCompanyListItem[]> {
  return apiRequest<ApiCompanyListItem[]>({
    url: '/intelligence/companies',
    method: 'GET',
    params: signal ? { hiring_signal: signal } : undefined,
  });
}

export async function getCompanyPatternFromApi(slug: string): Promise<ApiCompanyPattern> {
  return apiRequest<ApiCompanyPattern>({
    url: `/intelligence/companies/${encodeURIComponent(slug)}/pattern`,
    method: 'GET',
  });
}

export async function generateStudyPlan(payload: SkillGapPayload): Promise<ApiStudyPlan> {
  return apiRequest<ApiStudyPlan>({
    url: '/intelligence/skill-gap',
    method: 'POST',
    data: payload,
  });
}
