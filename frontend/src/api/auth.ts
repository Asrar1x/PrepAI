import { apiClient } from './client';
import { LoginCredentials, RegisterPayload, AuthResponse, User, UserRole } from '../types/auth';

// Maps the server's user document (snake_case or camelCase) to the client User shape.
// Missing numeric fields default to 0, never to invented progress values.
export function normalizeUser(rawUser: any, fallback: Partial<User> = {}): User {
  return {
    id: rawUser.id || rawUser._id,
    name: rawUser.fullName || rawUser.full_name || rawUser.name || fallback.name || rawUser.email?.split('@')[0] || 'User',
    email: rawUser.email || fallback.email || '',
    role: (rawUser.role || 'student') as UserRole,
    collegeName: rawUser.collegeName || rawUser.college_name || fallback.collegeName,
    branch: rawUser.branch || fallback.branch,
    graduationYear: Number(rawUser.graduationYear || rawUser.graduation_year || fallback.graduationYear) || undefined,
    targetRoles: rawUser.targetRoles || rawUser.target_roles || [],
    targetCompanies: rawUser.targetCompanies || rawUser.target_companies || [],
    streakCount: rawUser.currentStreak ?? rawUser.current_streak ?? 0,
    xpPoints: rawUser.totalXp ?? rawUser.total_xp ?? 0,
    level: rawUser.level ?? 1,
    readinessScore: rawUser.readinessScore ?? 0,
    createdAt: rawUser.createdAt || new Date().toISOString(),
    updatedAt: rawUser.updatedAt || new Date().toISOString()
  };
}

function extractAuth(data: any): { rawUser: any; token: string | undefined; refreshToken: string | undefined } {
  return {
    rawUser: data.user || data.data?.user,
    token: data.token || data.access_token || data.accessToken || data.data?.access_token || data.data?.token,
    refreshToken: data.refreshToken || data.refresh_token || data.data?.refresh_token
  };
}

export const authApi = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const res = await apiClient.post<any>('/auth/login', {
      email: credentials.email.trim(),
      password: credentials.password
    });

    const { rawUser, token, refreshToken } = extractAuth(res.data);
    if (!rawUser || !token) {
      throw new Error(res.data.detail || res.data.message || 'Login failed. Invalid response from server.');
    }
    return { user: normalizeUser(rawUser), token, refreshToken };
  },

  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const res = await apiClient.post<any>('/auth/register', {
      email: payload.email.trim(),
      password: payload.password,
      full_name: payload.name.trim(),
      college_name: payload.collegeName,
      branch: payload.branch,
      graduation_year: Number(payload.graduationYear || new Date().getFullYear())
    });

    const { rawUser, token, refreshToken } = extractAuth(res.data);
    if (!rawUser || !token) {
      throw new Error(res.data.detail || res.data.message || 'Registration failed. Invalid response from server.');
    }
    return {
      user: normalizeUser(rawUser, {
        name: payload.name,
        email: payload.email,
        collegeName: payload.collegeName,
        branch: payload.branch,
        graduationYear: payload.graduationYear
      }),
      token,
      refreshToken
    };
  },

  async getMe(): Promise<User> {
    const res = await apiClient.get<any>('/users/me');
    return normalizeUser(res.data?.data || res.data);
  },

  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.post<{ message: string }>('/auth/forgot-password', { email });
    return { success: true, message: res.data.message || 'If an account exists for this email, a reset code has been sent.' };
  },

  async resetPassword(data: { email: string; otp: string; password: string }): Promise<{ success: boolean }> {
    await apiClient.post('/auth/reset-password', {
      email: data.email.trim(),
      otp: data.otp.trim(),
      password: data.password
    });
    return { success: true };
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Logging out is purely client-side for stateless JWTs; ignore network errors
    }
  }
};
