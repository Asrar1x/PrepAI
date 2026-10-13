export const storage = {
  get<T>(key: string, defaultValue: T): T {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return defaultValue;
      const raw = window.localStorage.getItem(key);
      if (!raw) return defaultValue;
      return JSON.parse(raw) as T;
    } catch {
      return defaultValue;
    }
  },

  set<T>(key: string, value: T): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn(`[Storage] Failed to save key "${key}"`, e);
    }
  },

  remove(key: string): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      window.localStorage.removeItem(key);
    } catch (e) {
      console.warn(`[Storage] Failed to remove key "${key}"`, e);
    }
  },

  clear(): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      window.localStorage.clear();
    } catch (e) {
      console.warn('[Storage] Failed to clear localStorage', e);
    }
  }
};
