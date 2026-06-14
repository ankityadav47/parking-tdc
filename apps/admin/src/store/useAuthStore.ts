import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginSession: string | null;
  setAuth: (user: User, session: string) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  loginSession: null,

  setAuth: (user, session) => set({ user, isAuthenticated: true, loginSession: session, isLoading: false }),
  logout: () => set({ user: null, isAuthenticated: false, loginSession: null, isLoading: false }),
  setLoading: (loading) => set({ isLoading: loading }),
}));
