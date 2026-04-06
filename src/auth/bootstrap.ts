import { subscribeToAuthState } from '@/src/auth/session';
import { useAuthStore } from '@/src/store/auth-store';

export function startAuthBootstrap() {
  const { setState } = useAuthStore.getState();
  setState({ isBootstrapping: true });

  return subscribeToAuthState(({ user, role, profile }) => {
    setState({ user, role, profile, isBootstrapping: false });
  });
}

