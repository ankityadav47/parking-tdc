import { create } from 'zustand';
import { Role } from '@parkspot/types';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  status: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true, // Initially true while we check for existing session
  setAuth: (user, token) => {
    // We don't store the token in localStorage anymore for security (except maybe for the client instance, handled by api wrapper)
    // The refresh token is in a secure cookie.
    set({ user, isAuthenticated: true, isLoading: false });
  },
  logout: () => {
    set({ user: null, isAuthenticated: false, isLoading: false });
  },
  setLoading: (loading) => set({ isLoading: loading }),
}));
