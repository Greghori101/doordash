import { create } from 'zustand';
import type { User } from 'firebase/auth';
import type { AppRole, UserProfile } from '@/src/auth/types';

type AuthState = {
  user: User | null;
  role: AppRole | null;
  profile: UserProfile | null;
  isBootstrapping: boolean;
  setState: (next: Partial<AuthState>) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  role: null,
  profile: null,
  isBootstrapping: true,
  setState: (next) => set(next),
}));

