import { create } from 'zustand';
import type { AdminUser } from '@/lib/types/api';

interface AuthState {
  accessToken: string | null;
  user: AdminUser | null;
  setAuth: (token: string, user: AdminUser) => void;
  setAccessToken: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  setAuth: (token, user) => set({ accessToken: token, user }),
  setAccessToken: (token) => set({ accessToken: token }),
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('digimanual_refresh_token');
    }
    set({ accessToken: null, user: null });
  },
}));
