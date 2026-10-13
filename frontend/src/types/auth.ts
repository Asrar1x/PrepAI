export type UserRole = 'student' | 'admin' | 'super_admin' | 'placement_officer' | 'recruiter';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  collegeName?: string;
  branch?: string;
  graduationYear?: number;
  targetRoles?: string[];
  targetCompanies?: string[];
  avatarUrl?: string;
  streakCount: number;
  xpPoints: number;
  level: number;
  readinessScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken?: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
  role?: UserRole;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  confirmPassword?: string;
  collegeName?: string;
  branch?: string;
  graduationYear?: number;
  targetRoles?: string[];
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken?: string;
  expiresIn?: number;
}
