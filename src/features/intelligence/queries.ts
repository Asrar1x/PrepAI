import { useMutation, useQuery } from '@tanstack/react-query';
import {
  generateStudyPlan,
  getCompanyPatternFromApi,
  listCompaniesFromApi,
  listRolesFromApi,
  type SkillGapPayload,
} from './api';

export const intelligenceKeys = {
  all: ['intelligence'] as const,
  roles: (category?: string) => [...intelligenceKeys.all, 'roles', category ?? 'all'] as const,
  companies: (signal?: string) => [...intelligenceKeys.all, 'companies', signal ?? 'all'] as const,
  pattern: (slug: string) => [...intelligenceKeys.all, 'company-pattern', slug] as const,
};

export function useIntelligenceRoles(category?: string) {
  return useQuery({
    queryKey: intelligenceKeys.roles(category),
    queryFn: () => listRolesFromApi(category),
  });
}

export function useIntelligenceCompanies(signal?: string) {
  return useQuery({
    queryKey: intelligenceKeys.companies(signal),
    queryFn: () => listCompaniesFromApi(signal),
  });
}

export function useCompanyPattern(slug: string) {
  return useQuery({
    queryKey: intelligenceKeys.pattern(slug),
    queryFn: () => getCompanyPatternFromApi(slug),
    enabled: Boolean(slug),
  });
}

export function useGenerateStudyPlan() {
  return useMutation({
    mutationFn: (payload: SkillGapPayload) => generateStudyPlan(payload),
  });
}
