import type { AppRole, UserProfile } from '@/src/auth/types';
import { firebaseAuth, firestore } from '@/src/firebase/client';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

export async function getOrCreateUserProfile(user: User): Promise<UserProfile> {
  const ref = doc(firestore, 'users', user.uid);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    return snap.data() as UserProfile;
  }

  const profile: Omit<UserProfile, 'role'> & { role?: AppRole } = {
    id: user.uid,
    name: user.displayName ?? undefined,
    email: user.email ?? undefined,
    createdAt: serverTimestamp(),
  };

  await setDoc(ref, profile, { merge: true });
  return profile as UserProfile;
}

export function subscribeToAuthState(
  onChange: (state: { user: User | null; role: AppRole | null; profile: UserProfile | null }) => void
) {
  return onAuthStateChanged(firebaseAuth, async (user) => {
    if (!user) {
      onChange({ user: null, role: null, profile: null });
      return;
    }

    try {
      const profile = await getOrCreateUserProfile(user);
      onChange({ user, role: profile.role ?? null, profile });
    } catch {
      onChange({ user, role: null, profile: null });
    }
  });
}
