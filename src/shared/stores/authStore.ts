import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthSession, User } from '@/shared/types';

export type AuthStatus = 'anonymous' | 'authenticated';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  status: AuthStatus;
  pendingPath: string | null;
  setSession: (session: AuthSession) => void;
  setAccessToken: (accessToken: string | null) => void;
  setRefreshToken: (refreshToken: string | null) => void;
  updateUser: (changes: Partial<User>) => void;
  signOut: () => void;
  setPendingPath: (path: string | null) => void;
  clearPendingPath: () => void;
}

const anonymousState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  status: 'anonymous' as const,
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      ...anonymousState,
  pendingPath: null,
  setSession: ({ user, accessToken, refreshToken }) => set({ user, accessToken, refreshToken, status: 'authenticated' }),
  setAccessToken: (accessToken) => set({ accessToken, status: accessToken ? 'authenticated' : 'anonymous' }),
  setRefreshToken: (refreshToken) => set({ refreshToken }),
  updateUser: (changes) => set((state) => {
    return state.user ? { user: { ...state.user, ...changes } } : { user: changes as User };
  }),
  signOut: () => set({ ...anonymousState, pendingPath: null }),
  setPendingPath: (pendingPath) => set({ pendingPath }),
  clearPendingPath: () => set({ pendingPath: null }),
    }),
    {
      name: 'prepai-auth-storage',
    }
  )
);

export const selectCurrentUser = (state: AuthState) => state.user;
export const selectIsAuthenticated = (state: AuthState) => state.status === 'authenticated';
