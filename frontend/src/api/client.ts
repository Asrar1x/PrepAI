import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { storage } from '../lib/storage';
import { TOKEN_STORAGE_KEY } from '../lib/constants';
import { useAuthStore } from '../store/authStore';

const baseURL = import.meta.env.VITE_API_URL || '/api/v1';

export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request Interceptor: Attach Bearer Token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = storage.get<string | null>(TOKEN_STORAGE_KEY, null);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Access tokens are short-lived. On a 401 the client rotates the token pair once using the
// refresh token and retries the request; if that fails the session has ended.
let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = useAuthStore.getState().refreshToken;
  if (!refreshToken) return null;
  try {
    const res = await axios.post(`${baseURL}/auth/refresh`, { refresh_token: refreshToken }, { timeout: 15000 });
    const access = res.data?.access_token || res.data?.data?.access_token;
    const nextRefresh = res.data?.refresh_token || res.data?.data?.refresh_token;
    if (!access || !nextRefresh) return null;
    useAuthStore.getState().setTokens(access, nextRefresh);
    return access;
  } catch {
    return null;
  }
}

function endSession() {
  useAuthStore.getState().clearAuth();
  if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
    window.location.assign('/login');
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ message?: string; detail?: string }>) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    const url = original?.url || '';
    const isAuthEndpoint = /\/auth\/(login|register|refresh|forgot-password|reset-password)/.test(url);
    if (error.response?.status === 401 && original && !isAuthEndpoint && useAuthStore.getState().isAuthenticated) {
      if (!original._retried) {
        original._retried = true;
        refreshInFlight = refreshInFlight || refreshAccessToken().finally(() => {
          refreshInFlight = null;
        });
        const token = await refreshInFlight;
        if (token) {
          original.headers.Authorization = `Bearer ${token}`;
          return apiClient.request(original);
        }
      }
      endSession();
    }
    return Promise.reject(error);
  }
);

// Human-readable API error formatter (Section 104)
export function getFriendlyErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const err = error as AxiosError<{ message?: string; detail?: string }>;
    if (err.response?.data?.message) return err.response.data.message;
    if (err.response?.data?.detail) return err.response.data.detail;

    switch (err.response?.status) {
      case 401:
        return 'Session expired. Please log in again.';
      case 403:
        return 'You do not have permission to access this feature.';
      case 404:
        return 'The requested resource was not found.';
      case 422:
        return 'Please check the information you entered.';
      case 429:
        return 'Too many requests. Please wait a moment and try again.';
      case 500:
        return 'Something went wrong on the server. Please try again.';
      default:
        break;
    }

    if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
      return 'Request timed out. Please check your network and try again.';
    }
    if (err.message === 'Network Error' || !err.response) {
      return 'Unable to connect to server. Please check your internet connection.';
    }
  }

  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred. Please try again.';
}
