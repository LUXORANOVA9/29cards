import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  role: string;
  displayName?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      login: (token, user) => set({ accessToken: token, user, isAuthenticated: true }),
      logout: () => set({ accessToken: null, user: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
