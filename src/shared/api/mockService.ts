import type { ApiEnvelope } from '@/shared/types';

export const isDemoMode = import.meta.env.VITE_DEMO_MODE !== 'false';

export const wait = (milliseconds = 340) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

export const createMockId = (prefix = 'demo') =>
  `${prefix}_${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2, 11)}`;

export const createMockEnvelope = <T>(data: T, message = 'Demo response'): ApiEnvelope<T> => ({
  status: 'success',
  data,
  message,
  request_id: createMockId('request'),
});

export async function mockRequest<T>(resolver: () => T | Promise<T>, delay = 340): Promise<T> {
  await wait(delay);
  return resolver();
}

/** Keep page modules API-shaped while the backend is unavailable. */
export async function fromDemo<T>(
  demoResolver: () => T | Promise<T>,
  liveRequest: () => Promise<T>,
  delay = 340,
): Promise<T> {
  return isDemoMode ? mockRequest(demoResolver, delay) : liveRequest();
}
