import { create } from 'zustand';
import type { ThemeId, ThemeMode } from '@/lib/types';

export const THEMES: Array<{ id: ThemeId; label: string; description: string }> = [
  { id: 'fresh', label: 'Fresh', description: 'Warm neutral paper, lime accent, soft corners' },
  { id: 'editorial', label: 'Editorial', description: 'Cream page, serif headlines, terracotta' },
  { id: 'minimal', label: 'Minimal', description: 'Crisp greys, slate blue, tight and dense' },
];

const THEME_KEY = 'kl.theme';
const MODE_KEY = 'kl.mode';

interface ThemeState {
  themeId: ThemeId;
  mode: ThemeMode;
  setTheme: (themeId: ThemeId) => void;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
}

function apply(themeId: ThemeId, mode: ThemeMode) {
  const root = document.documentElement;
  root.setAttribute('data-theme', themeId);
  root.classList.toggle('dark', mode === 'dark');
}

function initialTheme(): ThemeId {
  const stored = localStorage.getItem(THEME_KEY) as ThemeId | null;
  return stored && THEMES.some((theme) => theme.id === stored) ? stored : 'fresh';
}

function initialMode(): ThemeMode {
  const stored = localStorage.getItem(MODE_KEY) as ThemeMode | null;
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  themeId: initialTheme(),
  mode: initialMode(),
  setTheme: (themeId) => {
    localStorage.setItem(THEME_KEY, themeId);
    apply(themeId, get().mode);
    set({ themeId });
  },
  setMode: (mode) => {
    localStorage.setItem(MODE_KEY, mode);
    apply(get().themeId, mode);
    set({ mode });
  },
  toggleMode: () => get().setMode(get().mode === 'dark' ? 'light' : 'dark'),
}));

/** Applied before first paint so there is no flash of the wrong theme. */
export function bootstrapTheme() {
  const { themeId, mode } = useThemeStore.getState();
  apply(themeId, mode);
}
