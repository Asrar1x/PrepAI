export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  roles: {
    all: ['roles'] as const,
    list: (filters?: Record<string, string | number | undefined>) => ['roles', 'list', filters] as const,
    detail: (slug: string) => ['roles', 'detail', slug] as const,
  },
  companies: {
    all: ['companies'] as const,
    list: (filters?: Record<string, string | number | undefined>) => ['companies', 'list', filters] as const,
    detail: (slug: string) => ['companies', 'detail', slug] as const,
  },
  dashboard: ['dashboard'] as const,
  studyPlan: ['study-plan'] as const,
  aptitude: {
    all: ['aptitude'] as const,
    session: (id: string) => ['aptitude', 'session', id] as const,
    results: (id: string) => ['aptitude', 'results', id] as const,
    history: (filters?: Record<string, string | number | undefined>) => ['aptitude', 'history', filters] as const,
  },
  interviews: {
    all: ['interviews'] as const,
    session: (id: string) => ['interviews', 'session', id] as const,
    report: (id: string) => ['interviews', 'report', id] as const,
    transcript: (id: string) => ['interviews', 'transcript', id] as const,
    history: (filters?: Record<string, string | number | undefined>) => ['interviews', 'history', filters] as const,
  },
  resume: ['resume'] as const,
  notifications: ['notifications'] as const,
  admin: {
    overview: ['admin', 'overview'] as const,
    batch: (id: string) => ['admin', 'batch', id] as const,
    student: (id: string) => ['admin', 'student', id] as const,
  },
};
