import { create } from 'zustand';
import { api, getToken, setToken } from '@/lib/api';
import type { LoginResponse, User } from '@/lib/types';

interface AuthState {
  user: User | null;
  status: 'unknown' | 'authenticated' | 'anonymous';
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: 'unknown',

  login: async (username, password) => {
    const response = await api.post<LoginResponse>('/api/auth/login', { username, password });
    setToken(response.token);
    set({ user: response.user, status: 'authenticated' });
  },

  logout: async () => {
    try {
      await api.post('/api/auth/logout');
    } finally {
      setToken(null);
      set({ user: null, status: 'anonymous' });
    }
  },

  refresh: async () => {
    if (!getToken()) {
      set({ user: null, status: 'anonymous' });
      return;
    }
    try {
      const user = await api.get<User>('/api/auth/me');
      set({ user, status: 'authenticated' });
    } catch {
      setToken(null);
      set({ user: null, status: 'anonymous' });
    }
  },

  setUser: (user) => set({ user }),
}));
