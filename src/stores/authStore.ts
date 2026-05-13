import { create } from 'zustand';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase';

interface AuthState {
  user: User | null;
  ready: boolean;
  initAuth: () => () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  ready: false,
  initAuth: () => {
    const unsub = onAuthStateChanged(auth, (u) => {
      set({ user: u, ready: true });
    });
    return unsub;
  },
}));
