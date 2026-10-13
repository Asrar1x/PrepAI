import axios from 'axios';
import { apiClient } from './client';
import { Role, SkillGapAnalysisRequest, SkillGapAnalysisResponse } from '../types/role';
import { Company } from '../types/company';
import { FALLBACK_ROLES } from '../data/fallbackRoles';
import { FALLBACK_COMPANIES } from '../data/fallbackCompanies';

export const rolesApi = {
  async getRoles(): Promise<Role[]> {
    try {
      const res = await apiClient.get<Role[]>('/roles');
      if (Array.isArray(res.data) && res.data.length > 0) return res.data;
      return FALLBACK_ROLES;
    } catch {
      return FALLBACK_ROLES;
    }
  },

  // Returns null when the role does not exist. The bundled catalogue is used only when the API is unreachable.
  async getRoleBySlug(slug: string): Promise<Role | null> {
    try {
      const res = await apiClient.get<Role>(`/roles/${slug}`);
      return res.data && res.data.title ? res.data : null;
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) return null;
      return FALLBACK_ROLES.find((r) => r.slug === slug || r.id === slug) || null;
    }
  },

  async analyzeSkillGap(payload: SkillGapAnalysisRequest): Promise<SkillGapAnalysisResponse> {
    const res = await apiClient.post<SkillGapAnalysisResponse>('/skill-gap/analyze', payload);
    return res.data;
  }
};

export const companiesApi = {
  async getCompanies(): Promise<Company[]> {
    try {
      const res = await apiClient.get<Company[]>('/companies');
      if (Array.isArray(res.data) && res.data.length > 0) return res.data;
      return FALLBACK_COMPANIES;
    } catch {
      return FALLBACK_COMPANIES;
    }
  },

  // Returns null when the company does not exist. The bundled catalogue is used only when the API is unreachable.
  async getCompanyBySlug(slug: string): Promise<Company | null> {
    try {
      const res = await apiClient.get<Company>(`/companies/${slug}`);
      return res.data && res.data.name ? res.data : null;
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) return null;
      return FALLBACK_COMPANIES.find((c) => c.slug === slug || c.id === slug) || null;
    }
  }
};
