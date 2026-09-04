import axios, { type AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';
import { AppError, type ApiEnvelope, type AuthSession } from '@/shared/types';
import { useAuthStore } from '@/shared/stores/authStore';

const baseURL = import.meta.env.VITE_API_URL ?? '/api/v1';

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

export const apiClient = axios.create({
  baseURL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

const refreshClient = axios.create({ baseURL, withCredentials: true });
let refreshPromise: Promise<string | null> | null = null;

function unwrapEnvelope<T>(payload: ApiEnvelope<T> | T): T {
  if (typeof payload === 'object' && payload !== null && 'status' in payload && 'data' in payload) {
    const envelope = payload as ApiEnvelope<T>;
    if (envelope.status === 'error') {
      throw new AppError(envelope.message || 'The request could not be completed.', { requestId: envelope.request_id });
    }
    return envelope.data;
  }
  return payload as T;
}

function toAppError(error: AxiosError<ApiEnvelope<unknown> | { message?: string }>): AppError {
  const payload = error.response?.data;
  const envelope = payload && typeof payload === 'object' && 'message' in payload ? payload : undefined;
  return new AppError(envelope?.message || error.message || 'Something went wrong. Please try again.', {
    status: error.response?.status,
    requestId: 'request_id' in (envelope ?? {}) ? String((envelope as ApiEnvelope<unknown>).request_id) : undefined,
  });
}

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post<ApiEnvelope<Pick<AuthSession, 'accessToken'>> | Pick<AuthSession, 'accessToken'>>('/auth/refresh')
      .then((response) => unwrapEnvelope(response.data).accessToken ?? null)
      .then((accessToken) => {
        useAuthStore.getState().setAccessToken(accessToken);
        return accessToken;
      })
      .catch(() => {
        useAuthStore.getState().signOut();
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

apiClient.interceptors.request.use((config) => {
  const accessToken = useAuthStore.getState().accessToken;
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiEnvelope<unknown>>) => {
    const config = error.config as RetriableConfig | undefined;
    const isRefreshRequest = config?.url?.includes('/auth/refresh');
    if (error.response?.status === 401 && config && !config._retry && !isRefreshRequest) {
      config._retry = true;
      const accessToken = await refreshAccessToken();
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient.request(config);
      }
    }
    return Promise.reject(toAppError(error));
  },
);

export async function apiRequest<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await apiClient.request<ApiEnvelope<T> | T>(config);
  return unwrapEnvelope(response.data);
}

export { toAppError, unwrapEnvelope };
