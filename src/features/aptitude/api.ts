// Frontend API for Module 2 — adaptive aptitude test engine.
import { apiRequest } from '@/shared/api/client';

export interface AptitudeQuestion {
  id: string;
  category: string;
  difficulty: string;
  question: string;
  options: string[];
  topic?: string | null;
  estimated_seconds: number;
  source?: string | null;
}

export interface AptitudeReport {
  id: string;
  user_id: string;
  job_role: string;
  company_pattern?: string | null;
  mode: string;
  total_questions: number;
  correct_count: number;
  wrong_count: number;
  skipped_count: number;
  score: number;
  max_difficulty_reached?: string | null;
  category_scores: Record<string, { correct: number; total: number; weighted_pct: number }>;
  weak_topics: Array<{ category: string; weighted_pct: number }>;
  created_at?: string | null;
}

export interface AptitudeSubmitResponse {
  is_correct: boolean;
  correct_index: number;
  explanation?: string | null;
  solution?: Record<string, unknown> | null;
}

export interface AptitudeStartPayload {
  role_slug: string;
  company_slug?: string | null;
  mode?: 'adaptive' | 'fixed' | 'company';
  duration_minutes?: number;
  category?: string;
}

export async function startAptitudeSession(payload: AptitudeStartPayload): Promise<AptitudeReport> {
  return apiRequest<AptitudeReport>({
    url: '/aptitude/start',
    method: 'POST',
    data: payload,
  });
}

export async function getNextQuestion(sessionId: string): Promise<AptitudeQuestion> {
  return apiRequest<AptitudeQuestion>({
    url: `/aptitude/${sessionId}/next-question`,
    method: 'POST',
  });
}

export async function submitAptitudeAnswer(
  sessionId: string,
  payload: { question_id: string; selected_index: number; time_taken_seconds: number },
): Promise<AptitudeSubmitResponse> {
  return apiRequest<AptitudeSubmitResponse>({
    url: `/aptitude/${sessionId}/submit`,
    method: 'POST',
    data: payload,
  });
}

export async function endAptitudeSession(sessionId: string): Promise<AptitudeReport> {
  return apiRequest<AptitudeReport>({
    url: `/aptitude/${sessionId}/end`,
    method: 'POST',
  });
}

export async function getAptitudeReport(sessionId: string): Promise<AptitudeReport> {
  return apiRequest<AptitudeReport>({
    url: `/aptitude/${sessionId}/report`,
    method: 'GET',
  });
}
