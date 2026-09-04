export type InterviewType = 'Technical' | 'HR' | 'Behavioural' | 'Company simulation';

export interface InterviewDraft {
  roleSlug: string;
  companySlug: string;
  interviewType: InterviewType;
}

const storageKey = 'prepai.interview-draft';

export function readInterviewDraft(): InterviewDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const value: unknown = JSON.parse(window.sessionStorage.getItem(storageKey) ?? 'null');
    if (!value || typeof value !== 'object') return null;
    const draft = value as Partial<InterviewDraft>;
    if (!draft.roleSlug || !draft.companySlug || !draft.interviewType) return null;
    return { roleSlug: draft.roleSlug, companySlug: draft.companySlug, interviewType: draft.interviewType };
  } catch {
    return null;
  }
}

export function saveInterviewDraft(draft: InterviewDraft) {
  if (typeof window !== 'undefined') window.sessionStorage.setItem(storageKey, JSON.stringify(draft));
}

export function clearInterviewDraft() {
  if (typeof window !== 'undefined') window.sessionStorage.removeItem(storageKey);
}
