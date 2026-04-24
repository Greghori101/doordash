import type { AppRole, UserProfile } from '@/src/auth/types';
import { firebaseAuth, firestore } from '@/src/firebase/client';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';

async function ensureUserDocExists(user: User): Promise<void> {
  const ref = doc(firestore, 'users', user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(
      ref,
      { id: user.uid, name: user.displayName ?? null, email: user.email ?? null, createdAt: serverTimestamp() },
      { merge: true }
    );
  }
}

export function subscribeToAuthState(
  onChange: (state: { user: User | null; role: AppRole | null; profile: UserProfile | null }) => void
) {
  let unsubProfile: (() => void) | null = null;

  const unsubAuth = onAuthStateChanged(firebaseAuth, async (user) => {
    if (unsubProfile) {
      unsubProfile();
      unsubProfile = null;
    }

    if (!user) {
      onChange({ user: null, role: null, profile: null });
      return;
    }

    try {
      await ensureUserDocExists(user);
      const ref = doc(firestore, 'users', user.uid);
      unsubProfile = onSnapshot(ref, (snap) => {
        const profile = snap.exists() ? (snap.data() as UserProfile) : null;
        onChange({ user, role: profile?.role ?? null, profile });
      });
    } catch {
      onChange({ user, role: null, profile: null });
    }
  });

  return () => {
    unsubAuth();
    if (unsubProfile) unsubProfile();
  };
}
