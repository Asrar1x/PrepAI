import { create } from 'zustand';
import { User } from '../types/auth';
import { storage } from '../lib/storage';
import { queryClient } from '../app/queryClient';
import { TOKEN_STORAGE_KEY, USER_STORAGE_KEY, REFRESH_TOKEN_KEY } from '../lib/constants';

interface AuthStore {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  setAuth: (user: User, token: string, refreshToken?: string) => void;
  setTokens: (token: string, refreshToken: string) => void;
  updateUser: (updates: Partial<User>) => void;
  clearAuth: () => void;
  setError: (err: string | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

// Restore a previous session only when both the user and its token were persisted.
// There is no demo/default user: without a stored session the app starts signed out.
const storedUser = storage.get<User | null>(USER_STORAGE_KEY, null);
const storedToken = storage.get<string | null>(TOKEN_STORAGE_KEY, null);
const hasStoredSession = Boolean(storedUser && storedToken);

export const useAuthStore = create<AuthStore>((set) => ({
  user: hasStoredSession ? storedUser : null,
  token: hasStoredSession ? storedToken : null,
  refreshToken: hasStoredSession ? storage.get<string | null>(REFRESH_TOKEN_KEY, null) : null,
  isAuthenticated: hasStoredSession,
  isLoading: false,
  error: null,

  setAuth: (user, token, refreshToken) => {
    // Drop any cached server data that belonged to a previous session
    queryClient.clear();
    storage.set(USER_STORAGE_KEY, user);
    storage.set(TOKEN_STORAGE_KEY, token);
    if (refreshToken) storage.set(REFRESH_TOKEN_KEY, refreshToken);

    set({
      user,
      token,
      refreshToken: refreshToken || null,
      isAuthenticated: true,
      error: null,
      isLoading: false
    });
  },

  // Silent token rotation: keeps the signed-in user and cached data
  setTokens: (token, refreshToken) => {
    storage.set(TOKEN_STORAGE_KEY, token);
    storage.set(REFRESH_TOKEN_KEY, refreshToken);
    set({ token, refreshToken });
  },

  updateUser: (updates) => {
    set((state) => {
      if (!state.user) return state;
      const updatedUser = { ...state.user, ...updates };
      storage.set(USER_STORAGE_KEY, updatedUser);
      return { user: updatedUser };
    });
  },

  clearAuth: () => {
    queryClient.clear();
    storage.remove(USER_STORAGE_KEY);
    storage.remove(TOKEN_STORAGE_KEY);
    storage.remove(REFRESH_TOKEN_KEY);
    set({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      error: null,
      isLoading: false
    });
  },

  setError: (error) => set({ error }),
  setLoading: (isLoading) => set({ isLoading }),

  logout: () => {
    queryClient.clear();
    storage.remove(USER_STORAGE_KEY);
    storage.remove(TOKEN_STORAGE_KEY);
    storage.remove(REFRESH_TOKEN_KEY);
    set({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      error: null,
      isLoading: false
    });
  }
}));
