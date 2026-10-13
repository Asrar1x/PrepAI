import { apiClient } from './client';
import { ATSScoreResult, BulletImprovement } from '../types/resume';

// Maps the server's resume diagnostic payload to the client shape. Missing fields map to
// empty values, never to invented scores, skills or hot-spots.
export function normalizeATSScoreResult(data: any, fallbackName = 'Resume'): ATSScoreResult {
  const score = typeof data?.overallScore === 'number'
    ? data.overallScore
    : (typeof data?.atsScore === 'number' ? data.atsScore : (typeof data?.ats_score === 'number' ? data.ats_score : 0));

  const dimensions = Array.isArray(data?.dimensions)
    ? data.dimensions.map((dim: any, i: number) => ({
        id: dim?.id || `dim-${i + 1}`,
        name: dim?.name || `Dimension ${i + 1}`,
        score: typeof dim?.score === 'number' ? dim.score : 0,
        weight: typeof dim?.weight === 'number' ? dim.weight : 0,
        explanation: dim?.explanation || '',
        recommendations: Array.isArray(dim?.recommendations) ? dim.recommendations : []
      }))
    : [];

  const hotspots = Array.isArray(data?.hotspots)
    ? data.hotspots
        .filter((hs: any) => hs && typeof hs === 'object')
        .map((hs: any, i: number) => ({
          id: hs.id || `hs-${i + 1}`,
          category: hs.category || 'Project',
          title: hs.title || `Focus Area ${i + 1}`,
          detail: hs.detail || '',
          potentialQuestions: Array.isArray(hs.potentialQuestions) ? hs.potentialQuestions : []
        }))
    : [];

  const firstArray = (...candidates: any[]) => candidates.find((c) => Array.isArray(c)) || [];

  return {
    overallScore: score,
    parsedName: data?.parsedName || data?.filename?.replace(/\.pdf$/i, '') || fallbackName,
    extractedRoles: firstArray(data?.extractedRoles),
    dimensions,
    hotspots,
    detectedKeywords: firstArray(data?.detectedKeywords, data?.parsedSkills, data?.parsed_skills),
    missingKeywords: firstArray(data?.missingKeywords, data?.missing_keywords),
    wordCount: typeof data?.wordCount === 'number' ? data.wordCount : 0,
    formatCheck: data?.formatCheck || (score >= 75 ? 'Valid ATS-Friendly' : 'Needs Review')
  };
}

export const resumeApi = {
  async uploadResume(file: File): Promise<ATSScoreResult> {
    const formData = new FormData();
    formData.append('resume', file);
    const res = await apiClient.post<any>('/users/me/resume', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000
    });
    return normalizeATSScoreResult(res.data, file.name.replace(/\.pdf$/i, ''));
  },

  async getLatestResume(): Promise<ATSScoreResult | null> {
    try {
      const res = await apiClient.get<any>('/users/me/resume');
      return res.data ? normalizeATSScoreResult(res.data) : null;
    } catch (err: any) {
      // 404 simply means the student has not uploaded a resume yet
      if (err?.response?.status === 404) return null;
      throw err;
    }
  },

  async improveBullet(originalBullet: string, targetRole = 'Software Engineer'): Promise<BulletImprovement> {
    const res = await apiClient.post<BulletImprovement>('/resume/bullets/improve', {
      bullet: originalBullet,
      role: targetRole
    }, { timeout: 60000 });
    return res.data;
  }
};
