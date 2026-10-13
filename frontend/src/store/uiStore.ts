import { create } from 'zustand';

export type AppTheme = 'light' | 'dark';

const getInitialTheme = (): AppTheme => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('prepai_theme');
    if (saved === 'dark' || saved === 'light') return saved;
  }
  return 'light'; // Light theme by default as requested
};

const applyThemeToDOM = (theme: AppTheme) => {
  if (typeof document !== 'undefined') {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    }
  }
};

const initialTheme = getInitialTheme();
applyThemeToDOM(initialTheme);

interface UiStore {
  theme: AppTheme;
  isSidebarCollapsed: boolean;
  isMobileDrawerOpen: boolean;
  isNotificationPanelOpen: boolean;
  activeModal: {
    id: string;
    payload?: unknown;
  } | null;

  toggleTheme: () => void;
  setTheme: (theme: AppTheme) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleMobileDrawer: () => void;
  setMobileDrawerOpen: (open: boolean) => void;
  toggleNotificationPanel: () => void;
  setNotificationPanelOpen: (open: boolean) => void;
  openModal: (id: string, payload?: unknown) => void;
  closeModal: () => void;
}

export const useUiStore = create<UiStore>((set) => ({
  theme: initialTheme,
  isSidebarCollapsed: false,
  isMobileDrawerOpen: false,
  isNotificationPanelOpen: false,
  activeModal: null,

  toggleTheme: () =>
    set((state) => {
      const nextTheme: AppTheme = state.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('prepai_theme', nextTheme);
      applyThemeToDOM(nextTheme);
      return { theme: nextTheme };
    }),
  setTheme: (theme: AppTheme) => {
    localStorage.setItem('prepai_theme', theme);
    applyThemeToDOM(theme);
    set({ theme });
  },
  toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  setSidebarCollapsed: (isSidebarCollapsed) => set({ isSidebarCollapsed }),
  toggleMobileDrawer: () => set((state) => ({ isMobileDrawerOpen: !state.isMobileDrawerOpen })),
  setMobileDrawerOpen: (isMobileDrawerOpen) => set({ isMobileDrawerOpen }),
  toggleNotificationPanel: () => set((state) => ({ isNotificationPanelOpen: !state.isNotificationPanelOpen })),
  setNotificationPanelOpen: (isNotificationPanelOpen) => set({ isNotificationPanelOpen }),
  openModal: (id, payload) => set({ activeModal: { id, payload } }),
  closeModal: () => set({ activeModal: null })
}));
